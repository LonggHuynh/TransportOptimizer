locals {
  gke_cluster_name = lookup(
    try(data.terraform_remote_state.common.outputs.gke_cluster_names, {}),
    var.common_gke_output_key,
    var.gke_cluster_name
  )
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
    },
    local.cors_origin_entries
  )

  worker_config = {
    "RESULT_TTL_SECONDS"     = tostring(var.worker_result_ttl_seconds)
    "REDIS_URL"              = local.redis_endpoint
    "REDIS_IAM_AUTH_ENABLED" = tostring(var.redis_auth_mode == "AUTH_MODE_IAM_AUTH")
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
