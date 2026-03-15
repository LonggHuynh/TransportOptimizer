data "google_client_config" "default" {}

data "terraform_remote_state" "common" {
  backend = "remote"

  config = {
    organization = var.common_organization
    workspaces = {
      name = var.common_workspace_name
    }
  }
}

locals {
  gke_cluster_name = lookup(
    try(data.terraform_remote_state.common.outputs.gke_cluster_names, {}),
    var.common_gke_output_key,
    var.gke_cluster_name
  )
}

data "google_container_cluster" "gke" {
  name     = local.gke_cluster_name
  location = var.region
}

provider "helm" {
  kubernetes {
    host                   = "https://${data.google_container_cluster.gke.endpoint}"
    token                  = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(data.google_container_cluster.gke.master_auth[0].cluster_ca_certificate)
  }
}

locals {
  name_prefix = lower(replace("${var.cluster_name}-${var.environment}", "_", "-"))
  namespace   = local.name_prefix

  backend_gsa = lookup(
    try(data.terraform_remote_state.common.outputs.backend_service_account_emails, {}),
    var.environment,
    ""
  )

  worker_gsa = lookup(
    try(data.terraform_remote_state.common.outputs.worker_service_account_emails, {}),
    var.environment,
    ""
  )

  redis_host = lookup(
    try(data.terraform_remote_state.common.outputs.redis_host_by_env, {}),
    var.environment,
    ""
  )

  redis_port = lookup(
    try(data.terraform_remote_state.common.outputs.redis_port_by_env, {}),
    var.environment,
    0
  )

  redis_app_host = var.redis_k8s_service_enabled ? var.redis_k8s_service_name : local.redis_host
  redis_endpoint = "${local.redis_app_host}:${local.redis_port}"
  redis_scheme   = var.redis_use_tls ? "rediss" : "redis"

  aspnetcore_environment = var.environment == "stage" ? "Staging" : var.environment == "prod" ? "Production" : "Production"

  cors_origin_entries = {
    for idx, origin in var.cors_allowed_origins :
    "CorsSettings__AllowedOrigins__${idx}" => origin
  }

  backend_config = merge(
    {
      "GoogleMaps__ApiUrl"      = var.google_maps_api_url
      "GoogleMaps__TileSize"    = tostring(var.google_maps_tile_size)
      "GoogleMaps__TileMapType" = var.google_maps_tile_map_type
      "ASPNETCORE_ENVIRONMENT"  = local.aspnetcore_environment
      "ASPNETCORE_URLS"         = "http://0.0.0.0:${var.backend_container_port}"
      "Redis__Endpoint"         = local.redis_endpoint
      "Redis__IamAuthEnabled"   = tostring(var.redis_auth_mode == "AUTH_MODE_IAM_AUTH")
      "Redis__UseTls"           = tostring(var.redis_use_tls)
    },
    local.cors_origin_entries
  )

  worker_config = {
    "RESULT_TTL_SECONDS"     = tostring(var.worker_result_ttl_seconds)
    "REDIS_URL"              = "${local.redis_scheme}://${local.redis_endpoint}"
    "REDIS_IAM_AUTH_ENABLED" = tostring(var.redis_auth_mode == "AUTH_MODE_IAM_AUTH")
    "REDIS_USE_TLS"          = tostring(var.redis_use_tls)
  }

  ghcr_credentials_provided = var.ghcr_username != "" && var.ghcr_token != ""
  effective_image_pull_secret_name = var.image_pull_secret_name != "" ? var.image_pull_secret_name : (
    local.ghcr_credentials_provided ? "ghcr" : ""
  )

  helm_sensitive_values = local.ghcr_credentials_provided ? [{
    name  = "imagePullSecret.password"
    value = var.ghcr_token
  }] : []
}

resource "helm_release" "app" {
  name             = "transport-optimizer"
  chart            = "${path.module}/../../app-chart"
  namespace        = local.namespace
  create_namespace = true
  timeout          = 180
  reuse_values     = false

  lifecycle {
    precondition {
      condition     = local.backend_gsa != "" && local.worker_gsa != ""
      error_message = "Missing backend/worker service account outputs for this environment in transport-common."
    }
    precondition {
      condition     = local.redis_port > 0 && (var.redis_k8s_service_enabled || local.redis_host != "")
      error_message = "Missing Redis outputs for this environment in transport-common."
    }
    precondition {
      condition = !var.gateway_enabled || !var.gateway_tls_enabled || (
        length(var.gateway_tls_certificate_refs) > 0 || length(var.gateway_tls_options) > 0
      )
      error_message = "Gateway TLS is enabled but no certificate refs or TLS options were configured."
    }
    precondition {
      condition     = !var.resource_quota_enabled || length(var.resource_quota_hard) > 0
      error_message = "resource_quota_hard must be configured when resource_quota_enabled is true."
    }
  }

  values = [yamlencode({
    commonLabels = {
      "app.kubernetes.io/part-of" = "transport-optimizer"
      "env"                       = var.environment
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
        tag        = var.backend_image_tag
        pullPolicy = var.image_pull_policy
      }
      service = {
        port          = var.backend_service_port
        containerPort = var.backend_container_port
      }
      health = {
        path = var.backend_health_path
      }
      serviceAccount = {
        create = true
        name   = "backend"
        annotations = {
          "iam.gke.io/gcp-service-account" = local.backend_gsa
        }
      }
      config = {
        enabled = true
        data    = local.backend_config
      }
      secret = {
        enabled = false
      }
    }
    worker = {
      image = {
        repository = var.worker_image
        tag        = var.worker_image_tag
        pullPolicy = var.image_pull_policy
      }
      serviceAccount = {
        create = true
        name   = "worker"
        annotations = {
          "iam.gke.io/gcp-service-account" = local.worker_gsa
        }
      }
      config = {
        enabled = true
        data    = local.worker_config
      }
      secret = {
        enabled = false
      }
    }
    frontend = {
      enabled = true
      image = {
        repository = var.frontend_image
        tag        = var.frontend_image_tag
        pullPolicy = var.image_pull_policy
      }
    }
    gateway = {
      enabled           = var.gateway_enabled
      className         = var.gateway_class_name
      backendPathPrefix = var.backend_path_prefix
      hostnames         = var.gateway_hostnames
      tls = {
        enabled         = var.gateway_tls_enabled
        mode            = "Terminate"
        certificateRefs = var.gateway_tls_certificate_refs
        options         = var.gateway_tls_options
      }
      httpRedirectToHttps    = var.gateway_http_redirect_to_https
      httpRedirectStatusCode = var.gateway_http_redirect_status_code
      backendHealthCheckPolicy = {
        enabled     = true
        name        = "backend-healthz"
        requestPath = var.backend_health_path
      }
    }
    redis = {
      enabled     = var.redis_k8s_service_enabled
      serviceName = var.redis_k8s_service_name
      host        = local.redis_host
      port        = local.redis_port
    }
    resourceQuota = {
      enabled = var.resource_quota_enabled
      hard    = var.resource_quota_hard
    }
  })]

  dynamic "set_sensitive" {
    for_each = local.helm_sensitive_values
    content {
      name  = set_sensitive.value.name
      value = set_sensitive.value.value
    }
  }
}
