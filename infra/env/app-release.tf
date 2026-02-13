resource "helm_release" "app" {
  name             = "transport-optimizer"
  chart            = "${path.module}/../app-chart"
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
  })]

  dynamic "set_sensitive" {
    for_each = local.helm_sensitive_values
    content {
      name  = set_sensitive.value.name
      value = set_sensitive.value.value
    }
  }
}
