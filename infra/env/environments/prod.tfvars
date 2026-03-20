project_id  = "pathoptimizer-486102"
region      = "europe-north1"
environment = "prod"

cluster_name     = "transport"
gke_cluster_name = "transport"

backend_image      = "ghcr.io/longhuynh5713/pathplanner-backend"
worker_image       = "ghcr.io/longhuynh5713/pathplanner-worker"
frontend_image     = "ghcr.io/longhuynh5713/pathplanner-frontend"
backend_image_tag  = "prod-latest"
worker_image_tag   = "prod-latest"
frontend_image_tag = "prod-latest"
image_pull_policy  = "IfNotPresent"

backend_container_port = 8080
backend_service_port   = 80
backend_health_path    = "/healthz"
backend_path_prefix    = "/api"

gateway_enabled    = true
gateway_class_name = "gke-l7-global-external-managed"
gateway_hostnames  = []
# Create this secret in transport-prod (or replace with gateway_tls_options cert map settings).
gateway_tls_enabled = true
gateway_tls_certificate_refs = [
  {
    name  = "gateway-tls"
    kind  = "Secret"
    group = ""
  }
]
gateway_tls_options              = {}
gateway_http_redirect_to_https   = true
gateway_http_redirect_status_code = 301

redis_auth_mode           = "AUTH_MODE_IAM_AUTH"
redis_k8s_service_enabled = true
redis_k8s_service_name    = "redis"
redis_use_tls             = true

google_maps_api_url       = "https://maps.googleapis.com/maps/api"
google_maps_tile_map_type = "roadmap"
google_maps_tile_size     = 256
cors_allowed_origins      = []

worker_result_ttl_seconds = 300
resource_quota_enabled    = true
resource_quota_hard = {
  "requests.cpu"    = "4"
  "requests.memory" = "8Gi"
  "limits.cpu"      = "8"
  "limits.memory"   = "16Gi"
  "pods"            = "40"
}

ghcr_username          = ""
ghcr_token             = ""
ghcr_server            = "ghcr.io"
image_pull_secret_name = ""
