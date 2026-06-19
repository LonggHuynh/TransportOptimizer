variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "region" {
  type        = string
  description = "GCP region."
  default     = "europe-north1"
}

variable "cluster_name" {
  type        = string
  description = "Cluster base name for namespace naming."
  default     = "transport"
}

variable "gke_cluster_name" {
  type        = string
  description = "Shared GKE cluster name fallback."
  default     = "transport"
}

variable "environment" {
  type        = string
  description = "Environment name for this app root."

  validation {
    condition     = contains(["stage", "prod"], var.environment)
    error_message = "environment must be stage or prod."
  }
}

variable "common_organization" {
  type        = string
  description = "Terraform Cloud organization name for common state."
  default     = "LongHuynhh"
}

variable "common_workspace_name" {
  type        = string
  description = "Terraform Cloud workspace name for shared common infra."
  default     = "transport-common"
}

variable "common_gke_output_key" {
  type        = string
  description = "Key used to look up GKE outputs from common workspace."
  default     = "gke"
}

variable "backend_image" {
  type        = string
  description = "Backend image repository."
}

variable "worker_image" {
  type        = string
  description = "Worker image repository."
}

variable "frontend_image" {
  type        = string
  description = "Frontend image repository."
}

variable "backend_image_tag" {
  type        = string
  description = "Backend image tag."
  default     = "latest"
}

variable "worker_image_tag" {
  type        = string
  description = "Worker image tag."
  default     = "latest"
}

variable "frontend_image_tag" {
  type        = string
  description = "Frontend image tag."
  default     = "latest"
}

variable "image_pull_policy" {
  type        = string
  description = "Image pull policy."
  default     = "IfNotPresent"

  validation {
    condition     = contains(["Always", "IfNotPresent", "Never"], var.image_pull_policy)
    error_message = "image_pull_policy must be Always, IfNotPresent, or Never."
  }
}

variable "backend_container_port" {
  type        = number
  description = "Backend container port."
  default     = 8080
}

variable "backend_service_port" {
  type        = number
  description = "Backend service port."
  default     = 80
}

variable "backend_health_path" {
  type        = string
  description = "Backend health path."
  default     = "/healthz"
}

variable "backend_path_prefix" {
  type        = string
  description = "Gateway path prefix for backend routes."
  default     = "/api"
}

variable "gateway_enabled" {
  type        = bool
  description = "Enable Gateway/HTTPRoute resources."
  default     = true
}

variable "gateway_class_name" {
  type        = string
  description = "Gateway class name."
  default     = "gke-l7-global-external-managed"
}

variable "gateway_hostnames" {
  type        = list(string)
  description = "Optional hostnames for Gateway listener and HTTPRoute."
  default     = []
}

variable "redis_auth_mode" {
  type        = string
  description = "Redis auth mode to pass into app config."
  default     = "AUTH_MODE_IAM_AUTH"
}

variable "redis_k8s_service_enabled" {
  type        = bool
  description = "Create in-namespace Redis service alias."
  default     = true
}

variable "redis_k8s_service_name" {
  type        = string
  description = "Redis service alias name."
  default     = "redis"
}

variable "google_maps_api_url" {
  type        = string
  description = "Google Maps API base URL."
  default     = "https://maps.googleapis.com/maps/api"
}

variable "google_maps_tile_map_type" {
  type        = string
  description = "Google Maps tile map type."
  default     = "roadmap"
}

variable "google_maps_tile_size" {
  type        = number
  description = "Google Maps tile size."
  default     = 256
}

variable "cors_allowed_origins" {
  type        = list(string)
  description = "Allowed CORS origins."
  default     = []
}

variable "worker_result_ttl_seconds" {
  type        = number
  description = "Worker result TTL in seconds."
  default     = 300
}

variable "ghcr_username" {
  type        = string
  description = "GHCR username."
  default     = ""
}

variable "ghcr_token" {
  type        = string
  description = "GHCR token."
  default     = ""
  sensitive   = true
}

variable "ghcr_server" {
  type        = string
  description = "Container registry server."
  default     = "ghcr.io"
}

variable "image_pull_secret_name" {
  type        = string
  description = "Image pull secret name."
  default     = ""
}

variable "redis_operator_enabled" {
  type        = bool
  description = "Install the OT Container Kit Redis Operator in the cluster."
  default     = false
}

variable "redis_operator_managed" {
  type        = bool
  description = "Manage Redis via the Redis Operator CRD instead of an external Memorystore endpoint."
  default     = false
}

variable "redis_cluster_size" {
  type        = number
  description = "Number of master nodes in the operator-managed Redis cluster."
  default     = 3
}

variable "redis_cluster_replicas" {
  type        = number
  description = "Replicas per master shard in the operator-managed Redis cluster."
  default     = 1
}

variable "redis_persistence_enabled" {
  type        = bool
  description = "Enable PVC persistence for the operator-managed Redis cluster."
  default     = true
}

variable "redis_storage_size" {
  type        = string
  description = "PVC size per Redis node for the operator-managed cluster."
  default     = "1Gi"
}

variable "redis_storage_class_name" {
  type        = string
  description = "StorageClass for operator-managed Redis PVCs. Leave empty to use the cluster default."
  default     = ""
}

variable "redis_image" {
  type        = string
  description = "Redis container image for the operator-managed cluster."
  default     = "quay.io/opstree/redis"
}

variable "redis_image_tag" {
  type        = string
  description = "Redis container image tag for the operator-managed cluster."
  default     = "v7.0.15"
}

variable "auth_service_image" {
  type        = string
  description = "Auth service image repository."
  default     = "ghcr.io/longhuynh5713/pathplanner-auth-service"
}

variable "auth_service_image_tag" {
  type        = string
  description = "Auth service image tag."
  default     = "latest"
}

variable "auth_service_container_port" {
  type        = number
  description = "Auth service container port."
  default     = 8083
}

variable "auth_service_service_port" {
  type        = number
  description = "Auth service service port."
  default     = 80
}

variable "auth_service_health_path" {
  type        = string
  description = "Auth service health path."
  default     = "/healthz"
}

variable "auth_service_oidc_issuer" {
  type        = string
  description = "OIDC issuer URL for token validation."
  default     = ""
}

variable "auth_service_oidc_audience" {
  type        = string
  description = "Expected OIDC token audience (client ID)."
  default     = ""
}

variable "auth_service_oidc_jwks_uri" {
  type        = string
  description = "Override JWKS URI. If empty, discovered from issuer metadata."
  default     = ""
}

variable "auth_service_token_leeway_seconds" {
  type        = number
  description = "Leeway in seconds for token exp/nbf validation."
  default     = 30
}
