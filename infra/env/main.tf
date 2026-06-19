module "app" {
  source = "../modules/app"

  project_id            = var.project_id
  region                = var.region
  cluster_name          = var.cluster_name
  gke_cluster_name      = var.gke_cluster_name
  environment           = var.environment
  common_organization   = var.common_organization
  common_workspace_name = var.common_workspace_name
  common_gke_output_key = var.common_gke_output_key

  backend_image      = var.backend_image
  worker_image       = var.worker_image
  frontend_image     = var.frontend_image
  backend_image_tag  = var.backend_image_tag
  worker_image_tag   = var.worker_image_tag
  frontend_image_tag = var.frontend_image_tag
  image_pull_policy  = var.image_pull_policy

  backend_container_port = var.backend_container_port
  backend_service_port   = var.backend_service_port
  backend_health_path    = var.backend_health_path
  backend_path_prefix    = var.backend_path_prefix

  gateway_enabled    = var.gateway_enabled
  gateway_class_name = var.gateway_class_name
  gateway_hostnames  = var.gateway_hostnames

  redis_auth_mode           = var.redis_auth_mode
  redis_k8s_service_enabled = var.redis_k8s_service_enabled
  redis_k8s_service_name    = var.redis_k8s_service_name
  redis_operator_enabled  = var.redis_operator_enabled
  redis_operator_managed  = var.redis_operator_managed
  redis_cluster_size      = var.redis_cluster_size
  redis_cluster_replicas  = var.redis_cluster_replicas
  redis_persistence_enabled = var.redis_persistence_enabled
  redis_storage_size      = var.redis_storage_size
  redis_storage_class_name = var.redis_storage_class_name
  redis_image              = var.redis_image
  redis_image_tag          = var.redis_image_tag
  auth_service_image              = var.auth_service_image
  auth_service_image_tag          = var.auth_service_image_tag
  auth_service_container_port     = var.auth_service_container_port
  auth_service_service_port       = var.auth_service_service_port
  auth_service_health_path        = var.auth_service_health_path
  auth_service_oidc_issuer        = var.auth_service_oidc_issuer
  auth_service_oidc_audience      = var.auth_service_oidc_audience
  auth_service_oidc_jwks_uri      = var.auth_service_oidc_jwks_uri
  auth_service_token_leeway_seconds = var.auth_service_token_leeway_seconds


  google_maps_api_url       = var.google_maps_api_url
  google_maps_tile_map_type = var.google_maps_tile_map_type
  google_maps_tile_size     = var.google_maps_tile_size
  cors_allowed_origins      = var.cors_allowed_origins

  worker_result_ttl_seconds = var.worker_result_ttl_seconds

  ghcr_username          = var.ghcr_username
  ghcr_token             = var.ghcr_token
  ghcr_server            = var.ghcr_server
  image_pull_secret_name = var.image_pull_secret_name
}
