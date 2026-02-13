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
  default     = "prod-latest"
}

variable "worker_image_tag" {
  type        = string
  description = "Worker image tag."
  default     = "prod-latest"
}

variable "frontend_image_tag" {
  type        = string
  description = "Frontend image tag."
  default     = "prod-latest"
}

variable "image_pull_policy" {
  type        = string
  description = "Image pull policy."
  default     = "IfNotPresent"
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

variable "google_maps_api_key" {
  type        = string
  description = "Google Maps API key."
  default     = ""
  sensitive   = true
}

variable "secret_manager_enabled" {
  type        = bool
  description = "Enable Secret Manager sync via CSI."
  default     = false
}

variable "backend_secret_name" {
  type        = string
  description = "Kubernetes secret name from Secret Manager sync."
  default     = "backend-secrets"
}

variable "backend_secret_provider_class" {
  type        = string
  description = "SecretProviderClass name."
  default     = "backend-secrets"
}

variable "backend_secret_mount_path" {
  type        = string
  description = "Secret mount path."
  default     = "/var/secrets"
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
