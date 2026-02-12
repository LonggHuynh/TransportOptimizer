data "google_client_config" "default" {}

data "google_container_cluster" "gke" {
  name     = google_container_cluster.primary.name
  location = var.region

  depends_on = [google_container_cluster.primary]
}

provider "helm" {
  kubernetes {
    host                   = "https://${data.google_container_cluster.gke.endpoint}"
    token                  = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(data.google_container_cluster.gke.master_auth[0].cluster_ca_certificate)
  }
}

locals {
  cors_origin_entries = {
    for env in local.environments : env => {
      for idx, origin in var.cors_allowed_origins :
      "CorsSettings__AllowedOrigins__${idx}" => origin
    }
  }

  backend_redis_config_entries = {
    for env in local.environments :
    env => {
      "Redis__Endpoint"       = local.redis_endpoint_by_env[env]
      "Redis__IamAuthEnabled" = tostring(var.redis_auth_mode == "AUTH_MODE_IAM_AUTH")
    }
  }

  worker_redis_config_entries = {
    for env in local.environments :
    env => {
      "REDIS_URL"              = local.redis_endpoint_by_env[env]
      "REDIS_IAM_AUTH_ENABLED" = tostring(var.redis_auth_mode == "AUTH_MODE_IAM_AUTH")
    }
  }

  backend_secret_enabled = !var.secret_manager_enabled && local.google_maps_api_key_provided
  worker_secret_enabled  = false

  backend_config = {
    for env in local.environments : env => merge(
      {
        "GoogleMaps__ApiUrl"      = var.google_maps_api_url
        "GoogleMaps__TileSize"    = tostring(var.google_maps_tile_size)
        "GoogleMaps__TileMapType" = var.google_maps_tile_map_type
        "ASPNETCORE_ENVIRONMENT"  = local.aspnetcore_environment[env]
        "ASPNETCORE_URLS"         = "http://0.0.0.0:${var.backend_container_port}"
      },
      local.cors_origin_entries[env],
      local.backend_redis_config_entries[env]
    )
  }

  worker_config = {
    for env in local.environments : env => merge(
      {
        "RESULT_TTL_SECONDS" = tostring(var.worker_result_ttl_seconds)
      },
      local.worker_redis_config_entries[env]
    )
  }

  helm_sensitive_values_by_env = {
    for env in local.environments :
    env => concat(
      local.google_maps_api_key_provided && !var.secret_manager_enabled ? [{
        name  = "backend.secret.data.GoogleMaps__ApiKey"
        value = var.google_maps_api_key
      }] : [],
      local.ghcr_credentials_provided ? [{
        name  = "imagePullSecret.password"
        value = var.ghcr_token
      }] : []
    )
  }
}

resource "helm_release" "app" {
  for_each = toset(local.environments)

  name             = "transport-optimizer"
  chart            = "${path.module}/app-chart"
  namespace        = local.k8s_namespace[each.key]
  create_namespace = true
  timeout          = 1800
  reuse_values     = true

  values = [yamlencode({
    commonLabels = {
      "app.kubernetes.io/part-of" = "transport-optimizer"
      "env"                       = each.key
    }
    imagePullSecrets = local.effective_image_pull_secret_name != "" ? [local.effective_image_pull_secret_name] : []
    imagePullSecret = {
      create   = local.ghcr_credentials_provided
      name     = local.effective_image_pull_secret_name
      registry = var.ghcr_server
      username = var.ghcr_username
    }
    backend = {
      image = merge(
        {
          repository = var.backend_image
          pullPolicy = lookup(var.image_pull_policy_by_env, each.key, var.default_image_pull_policy)
        },
        contains(keys(var.backend_image_tag_by_env), each.key) ? {
          tag = var.backend_image_tag_by_env[each.key]
        } : {}
      )
      service = {
        port          = var.backend_service_port
        containerPort = var.backend_container_port
      }
      health = {
        path = var.backend_health_path
      }
      serviceAccount = {
        create = true
        name   = local.backend_k8s_service_account
        annotations = {
          "iam.gke.io/gcp-service-account" = google_service_account.backend[each.key].email
        }
      }
      config = {
        enabled = true
        data    = local.backend_config[each.key]
      }
      secret = {
        enabled      = local.backend_secret_enabled
        existingName = var.secret_manager_enabled ? var.backend_secret_name : ""
      }
      secretsStore = {
        enabled       = var.secret_manager_enabled
        providerClass = var.backend_secret_provider_class
        mountPath     = var.backend_secret_mount_path
      }
    }
    worker = {
      image = merge(
        {
          repository = var.worker_image
          pullPolicy = lookup(var.image_pull_policy_by_env, each.key, var.default_image_pull_policy)
        },
        contains(keys(var.worker_image_tag_by_env), each.key) ? {
          tag = var.worker_image_tag_by_env[each.key]
        } : {}
      )
      health = {
        path = var.worker_health_path
        port = var.worker_health_port
      }
      serviceAccount = {
        create = true
        name   = local.worker_k8s_service_account
        annotations = {
          "iam.gke.io/gcp-service-account" = google_service_account.worker[each.key].email
        }
      }
      config = {
        enabled = true
        data    = local.worker_config[each.key]
      }
      secret = {
        enabled = local.worker_secret_enabled
      }
    }
    frontend = {
      image = merge(
        {
          repository = var.frontend_image
          pullPolicy = lookup(var.image_pull_policy_by_env, each.key, var.default_image_pull_policy)
        },
        contains(keys(var.frontend_image_tag_by_env), each.key) ? {
          tag = var.frontend_image_tag_by_env[each.key]
        } : {}
      )
    }
    gateway = {
      enabled           = var.gateway_enabled
      className         = var.gateway_class_name
      backendPathPrefix = var.backend_path_prefix
      hostnames         = lookup(var.gateway_hostnames_by_env, each.key, [])
    }
    redis = {
      enabled     = var.redis_k8s_service_enabled
      serviceName = var.redis_k8s_service_name
      host        = local.redis_host_by_env[each.key]
      port        = local.redis_port_by_env[each.key]
    }
  })]

  dynamic "set_sensitive" {
    for_each = local.helm_sensitive_values_by_env[each.key]
    content {
      name  = set_sensitive.value.name
      value = set_sensitive.value.value
    }
  }

  depends_on = [google_container_cluster.primary, google_redis_cluster.redis]
}
