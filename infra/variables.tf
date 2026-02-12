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

variable "frontend_image" {
  type        = string
  description = "Frontend container image."
  default     = ""
}

variable "default_image_tag" {
  type        = string
  description = "Default container image tag used when no environment override is provided."
  default     = "latest"
}

variable "backend_image_tag_by_env" {
  type        = map(string)
  description = "Optional backend image tag overrides by environment name."
  default     = {}
}

variable "worker_image_tag_by_env" {
  type        = map(string)
  description = "Optional worker image tag overrides by environment name."
  default     = {}
}

variable "frontend_image_tag_by_env" {
  type        = map(string)
  description = "Optional frontend image tag overrides by environment name."
  default     = {}
}

variable "default_image_pull_policy" {
  type        = string
  description = "Default image pull policy used when no environment override is provided."
  default     = "IfNotPresent"

  validation {
    condition     = contains(["Always", "IfNotPresent", "Never"], var.default_image_pull_policy)
    error_message = "default_image_pull_policy must be Always, IfNotPresent, or Never."
  }
}

variable "image_pull_policy_by_env" {
  type        = map(string)
  description = "Optional image pull policy overrides by environment name."
  default     = {}

  validation {
    condition = alltrue([
      for pull_policy in values(var.image_pull_policy_by_env) :
      contains(["Always", "IfNotPresent", "Never"], pull_policy)
    ])
    error_message = "image_pull_policy_by_env values must be Always, IfNotPresent, or Never."
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
  description = "Backend health check path."
  default     = "/healthz"
}

variable "worker_health_path" {
  type        = string
  description = "Worker health check path."
  default     = "/healthz"
}

variable "worker_health_port" {
  type        = number
  description = "Worker health check port."
  default     = 8081
}

variable "backend_path_prefix" {
  type        = string
  description = "Backend path prefix for routing."
  default     = "/api"
}

variable "gateway_enabled" {
  type        = bool
  description = "Whether to create Gateway and HTTPRoute resources."
  default     = true
}

variable "gateway_class_name" {
  type        = string
  description = "GatewayClass name used by Gateway API."
  default     = "gke-l7-global-external-managed"
}

variable "gateway_hostnames_by_env" {
  type        = map(list(string))
  description = "Optional hostnames by environment for the HTTPRoute and Gateway listener."
  default     = {}
}

variable "redis_mode" {
  type        = string
  description = "Redis mode (cluster only)."
  default     = "cluster"

  validation {
    condition     = var.redis_mode == "cluster"
    error_message = "redis_mode must be \"cluster\"."
  }
}

variable "redis_shard_count" {
  type        = number
  description = "Number of shards for the Redis Cluster."
  default     = 1
}

variable "redis_replica_count" {
  type        = number
  description = "Number of replicas per shard for the Redis Cluster."
  default     = 1
}

variable "redis_node_type" {
  type        = string
  description = "Redis Cluster node type (e.g. REDIS_SHARED_CORE_NANO)."
  default     = "REDIS_SHARED_CORE_NANO"
}

variable "redis_auth_mode" {
  type        = string
  description = "Redis Cluster authorization mode."
  default     = "AUTH_MODE_IAM_AUTH"

  validation {
    condition = contains([
      "AUTH_MODE_IAM_AUTH",
      "AUTH_MODE_DISABLED",
    ], var.redis_auth_mode)
    error_message = "redis_auth_mode must be AUTH_MODE_IAM_AUTH or AUTH_MODE_DISABLED."
  }
}

variable "redis_transit_encryption_mode" {
  type        = string
  description = "Redis Cluster transit encryption mode."
  default     = "TRANSIT_ENCRYPTION_MODE_DISABLED"

  validation {
    condition = contains([
      "TRANSIT_ENCRYPTION_MODE_DISABLED",
      "TRANSIT_ENCRYPTION_MODE_SERVER_AUTHENTICATION",
    ], var.redis_transit_encryption_mode)
    error_message = "redis_transit_encryption_mode must be TRANSIT_ENCRYPTION_MODE_DISABLED or TRANSIT_ENCRYPTION_MODE_SERVER_AUTHENTICATION."
  }
}

variable "psc_subnet_cidr" {
  type        = string
  description = "CIDR range for the Private Service Connect subnet."
  default     = "10.60.0.0/24"
}

variable "redis_psc_connection_limit" {
  type        = number
  description = "Service connection policy connection limit for Redis PSC endpoints."
  default     = 10
}

variable "redis_k8s_service_enabled" {
  type        = bool
  description = "Create a Kubernetes Service/Endpoints for Redis Cluster in the app namespaces."
  default     = true
}

variable "redis_k8s_service_name" {
  type        = string
  description = "Kubernetes Service name for Redis Cluster."
  default     = "redis"

  validation {
    condition     = !var.redis_k8s_service_enabled || var.redis_k8s_service_name != ""
    error_message = "redis_k8s_service_name must be set when redis_k8s_service_enabled is true."
  }
}

variable "google_maps_api_url" {
  type        = string
  description = "Google Maps API base URL."
  default     = "https://maps.googleapis.com/maps/api"
}

variable "google_maps_tile_map_type" {
  type        = string
  description = "Google Maps Static API map type."
  default     = "roadmap"
}

variable "google_maps_tile_size" {
  type        = number
  description = "Google Maps tile size in pixels."
  default     = 256
}

variable "cors_allowed_origins" {
  type        = list(string)
  description = "Allowed CORS origins for the backend."
  default     = []
}

variable "google_maps_api_key" {
  type        = string
  description = "Google Maps API key for the backend."
  default     = ""
  sensitive   = true
}

variable "google_maps_api_key_secret" {
  type        = string
  description = "Optional Secret Manager reference for Google Maps API key when using external secret sync."
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
