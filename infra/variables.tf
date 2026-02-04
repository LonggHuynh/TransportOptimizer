variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "region" {
  type        = string
  description = "GCP region for regional resources."
  default     = "europe-north1"
}

variable "cluster_name" {
  type        = string
  description = "GKE cluster name."
  default     = "transport"
}

variable "gke_mode" {
  type        = string
  description = "GKE mode. Autopilot is supported in this module."
  default     = "autopilot"

  validation {
    condition     = var.gke_mode == "autopilot"
    error_message = "Only gke_mode = \"autopilot\" is supported in this module right now."
  }
}

variable "gke_release_channel" {
  type        = string
  description = "GKE release channel for the cluster."
  default     = "REGULAR"

  validation {
    condition     = contains(["RAPID", "REGULAR", "STABLE"], var.gke_release_channel)
    error_message = "gke_release_channel must be RAPID, REGULAR, or STABLE."
  }
}

variable "vpc_name" {
  type        = string
  description = "VPC name."
  default     = "transport-vpc"
}

variable "subnet_name" {
  type        = string
  description = "Primary subnet name."
  default     = "transport-subnet"
}

variable "gke_subnet_name" {
  type        = string
  description = "Subnet name for the shared GKE cluster."
  default     = "transport-gke-subnet"
}

variable "subnet_cidr" {
  type        = string
  description = "Primary subnet CIDR."
  default     = "10.10.0.0/20"
}

variable "gke_subnet_cidr" {
  type        = string
  description = "Subnet CIDR for the shared GKE cluster."
  default     = "10.11.0.0/20"
}

variable "pods_secondary_range_name" {
  type        = string
  description = "Secondary range name for pods."
  default     = "pods"
}

variable "pods_secondary_cidr" {
  type        = string
  description = "Secondary CIDR range for pods."
  default     = "10.20.0.0/16"
}

variable "gke_pods_secondary_cidr" {
  type        = string
  description = "Pod secondary CIDR range for the shared GKE cluster."
  default     = "10.22.0.0/16"
}

variable "services_secondary_range_name" {
  type        = string
  description = "Secondary range name for services."
  default     = "services"
}

variable "services_secondary_cidr" {
  type        = string
  description = "Secondary CIDR range for services."
  default     = "10.30.0.0/20"
}

variable "gke_services_secondary_cidr" {
  type        = string
  description = "Service secondary CIDR range for the shared GKE cluster."
  default     = "10.31.0.0/20"
}

variable "frontend_bucket_name" {
  type        = string
  description = "Base name of the GCS bucket hosting the frontend. Must be globally unique. For multi-env, env suffix is appended unless frontend_bucket_names is set."
  default     = ""

  validation {
    condition     = var.frontend_bucket_name != "" || length(var.frontend_bucket_names) > 0
    error_message = "Set frontend_bucket_name or provide frontend_bucket_names."
  }
}

variable "cdn_enabled" {
  type        = bool
  description = "Enable Cloud CDN for the frontend load balancer."
  default     = true
}

variable "frontend_lb_name" {
  type        = string
  description = "Base name for frontend load balancer resources."
  default     = "transport-frontend"
}

variable "frontend_bucket_names" {
  type        = map(string)
  description = "Optional per-environment frontend bucket names."
  default     = {}
}

variable "subnet_cidrs" {
  type        = map(string)
  description = "Optional per-environment primary subnet CIDRs."
  default     = {}
}

variable "pods_secondary_cidrs" {
  type        = map(string)
  description = "Optional per-environment pod secondary CIDRs."
  default     = {}
}

variable "services_secondary_cidrs" {
  type        = map(string)
  description = "Optional per-environment service secondary CIDRs."
  default     = {}
}

variable "create_artifact_registry" {
  type        = bool
  description = "Whether to create an Artifact Registry repository."
  default     = false
}

variable "artifact_registry_location" {
  type        = string
  description = "Artifact Registry location (defaults to region if empty)."
  default     = null
}

variable "artifact_registry_repo_id" {
  type        = string
  description = "Artifact Registry repository ID."
  default     = "transport"
}

variable "environments" {
  type        = list(string)
  description = "Environment names for multi-env infra (e.g. [\"stage\", \"prod\"]). Empty = single env."
  default     = []
}

variable "gke_environment" {
  type        = string
  description = "Optional label suffix for shared GKE/network resources. Empty = no suffix."
  default     = ""
}

variable "backend_image" {
  type        = string
  description = "Backend container image (placeholder until app deployment is added)."
  default     = ""
}

variable "worker_image" {
  type        = string
  description = "Worker container image (placeholder until app deployment is added)."
  default     = ""
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
  description = "Backend health check path."
  default     = "/healthz"
}

variable "backend_path_prefix" {
  type        = string
  description = "Backend path prefix for routing."
  default     = "/api"
}

variable "redis_mode" {
  type        = string
  description = "Redis mode (memorystore or in-cluster)."
  default     = "in-cluster"

  validation {
    condition     = contains(["memorystore", "in-cluster"], var.redis_mode)
    error_message = "redis_mode must be \"memorystore\" or \"in-cluster\"."
  }
}

variable "redis_host" {
  type        = string
  description = "Redis hostname."
  default     = "redis-master.redis.svc.cluster.local"
}

variable "redis_port" {
  type        = number
  description = "Redis port."
  default     = 6379
}

variable "redis_chart_repository" {
  type        = string
  description = "Helm repository for the Redis chart."
  default     = "https://charts.bitnami.com/bitnami"
}

variable "redis_chart_version" {
  type        = string
  description = "Helm chart version for Redis."
  default     = "16.11.3"
}

variable "redis_image_repository" {
  type        = string
  description = "Redis image repository (without registry)."
  default     = "bitnamilegacy/redis"
}

variable "redis_image_tag" {
  type        = string
  description = "Redis image tag override (empty to use chart default)."
  default     = ""
}

variable "mapbox_api_url" {
  type        = string
  description = "Mapbox API base URL."
  default     = "https://api.mapbox.com"
}

variable "mapbox_tile_style_id" {
  type        = string
  description = "Mapbox tile style ID."
  default     = "mapbox/streets-v12"
}

variable "mapbox_tile_resolution" {
  type        = string
  description = "Mapbox tile resolution."
  default     = "low"
}

variable "mapbox_tile_size" {
  type        = number
  description = "Mapbox tile size in pixels."
  default     = 256
}

variable "mapbox_geocode_cache_minutes" {
  type        = number
  description = "Cache duration for successful geocodes (minutes)."
  default     = 1440
}

variable "mapbox_geocode_failure_cache_minutes" {
  type        = number
  description = "Cache duration for failed geocodes (minutes)."
  default     = 10
}

variable "mapbox_directions_profile" {
  type        = string
  description = "Mapbox directions profile."
  default     = "driving"
}

variable "mapbox_matrix_profile" {
  type        = string
  description = "Mapbox matrix profile."
  default     = "driving"
}

variable "cors_allowed_origins" {
  type        = list(string)
  description = "Allowed CORS origins for the backend."
  default     = []
}

variable "mapbox_access_token" {
  type        = string
  description = "Mapbox access token for the backend."
  default     = ""
  sensitive   = true
}

variable "mapbox_access_token_secret" {
  type        = string
  description = "Secret Manager secret resource name or secret id for Mapbox access token."
  default     = ""
}

variable "secret_manager_enabled" {
  type        = bool
  description = "Enable Secret Manager sync via Secrets Store CSI Driver."
  default     = false
}

variable "backend_secret_name" {
  type        = string
  description = "Kubernetes secret name created by Secret Manager sync."
  default     = "backend-secrets"
}

variable "backend_secret_provider_class" {
  type        = string
  description = "SecretProviderClass name used by Secrets Store CSI Driver."
  default     = "backend-secrets"
}

variable "backend_secret_mount_path" {
  type        = string
  description = "Mount path for the Secrets Store CSI volume."
  default     = "/var/secrets"
}

variable "worker_result_ttl_seconds" {
  type        = number
  description = "Worker result TTL in seconds."
  default     = 300
}

variable "ghcr_username" {
  type        = string
  description = "GHCR username for image pull secret."
  default     = ""
}

variable "ghcr_token" {
  type        = string
  description = "GHCR token (PAT) for image pull secret."
  default     = ""
  sensitive   = true
}

variable "ghcr_server" {
  type        = string
  description = "Container registry server for image pull secret."
  default     = "ghcr.io"
}

variable "image_pull_secret_name" {
  type        = string
  description = "Image pull secret name to use or create. Leave empty to disable."
  default     = ""
}
