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

  mapbox_secret_entries = {
    for env in local.environments :
    env => var.mapbox_access_token_secret != ""
      ? { "Mapbox__AccessTokenSecret" = var.mapbox_access_token_secret }
      : {}
  }

  backend_config = {
    for env in local.environments : env => merge(
      {
        "Mapbox__ApiUrl"                      = var.mapbox_api_url
        "Mapbox__TileStyleId"                = var.mapbox_tile_style_id
        "Mapbox__TileResolution"             = var.mapbox_tile_resolution
        "Mapbox__TileSize"                   = tostring(var.mapbox_tile_size)
        "Mapbox__GeocodeCacheMinutes"        = tostring(var.mapbox_geocode_cache_minutes)
        "Mapbox__GeocodeFailureCacheMinutes" = tostring(var.mapbox_geocode_failure_cache_minutes)
        "Mapbox__DirectionsProfile"          = var.mapbox_directions_profile
        "Mapbox__MatrixProfile"              = var.mapbox_matrix_profile
        "ASPNETCORE_ENVIRONMENT"             = local.aspnetcore_environment[env]
        "ASPNETCORE_URLS"                    = "http://0.0.0.0:${var.backend_container_port}"
        "Redis__ConnectionString"            = local.redis_connection_string_by_env[env]
      },
      local.cors_origin_entries[env],
      local.mapbox_secret_entries[env]
    )
  }

  worker_config = {
    for env in local.environments : env => {
      "REDIS_URL"          = local.redis_connection_string_by_env[env]
      "RESULT_TTL_SECONDS" = tostring(var.worker_result_ttl_seconds)
    }
  }
}

resource "helm_release" "redis" {
  for_each = var.redis_mode == "in-cluster" ? toset(local.environments) : []

  name             = "redis"
  repository       = var.redis_chart_repository
  chart            = "redis"
  version          = var.redis_chart_version
  namespace        = local.k8s_namespace[each.key]
  create_namespace = true
  wait             = true
  timeout          = 600
  atomic           = true
  cleanup_on_fail  = true

  values = [yamlencode({
    auth = {
      enabled = false
    }
    image = merge(
      {
        repository = var.redis_image_repository
      },
      var.redis_image_tag != "" ? { tag = var.redis_image_tag } : {}
    )
  })]

  depends_on = [google_container_cluster.primary]
}

resource "helm_release" "app" {
  for_each = toset(local.environments)

  name             = "transport-optimizer"
  chart            = "${path.module}/app-chart"
  namespace        = local.k8s_namespace[each.key]
  create_namespace = true

  values = [yamlencode({
    commonLabels = {
      "app.kubernetes.io/part-of" = "transport-optimizer"
      "env"                      = each.key
    }
    imagePullSecrets = local.effective_image_pull_secret_name != "" ? [local.effective_image_pull_secret_name] : []
    imagePullSecret = {
      create   = local.ghcr_credentials_provided
      name     = local.effective_image_pull_secret_name
      registry = var.ghcr_server
      username = var.ghcr_username
    }
    backend = {
      image = {
        repository = var.backend_image
      }
      service = {
        port          = var.backend_service_port
        containerPort = var.backend_container_port
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
        enabled      = local.mapbox_token_provided && !var.secret_manager_enabled
        existingName = var.secret_manager_enabled ? var.backend_secret_name : ""
      }
      secretsStore = {
        enabled       = var.secret_manager_enabled
        providerClass = var.backend_secret_provider_class
        mountPath     = var.backend_secret_mount_path
      }
    }
    worker = {
      image = {
        repository = var.worker_image
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
    }
  })]

  dynamic "set_sensitive" {
    for_each = local.mapbox_token_provided ? [1] : []
    content {
      name  = "backend.secret.data.Mapbox__AccessToken"
      value = var.mapbox_access_token
    }
  }

  dynamic "set_sensitive" {
    for_each = local.ghcr_credentials_provided ? [1] : []
    content {
      name  = "imagePullSecret.password"
      value = var.ghcr_token
    }
  }

  depends_on = [google_container_cluster.primary, helm_release.redis]
}
