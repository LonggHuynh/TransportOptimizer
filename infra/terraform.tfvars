# Core
project_id = "pathoptimizer-486102"
region     = "europe-north1"

environments = ["stage", "prod"]

# GKE
cluster_name = "transport"
gke_mode     = "autopilot" # autopilot | standard

# Network
vpc_name        = "transport-vpc"
subnet_name     = "transport-subnet"
subnet_cidr     = "10.10.0.0/20"
gke_subnet_name = "transport-gke-subnet"
gke_subnet_cidr = "10.11.0.0/20"
subnet_cidrs = {
  stage = "10.10.0.0/20"
  prod  = "10.10.16.0/20"
}
# If using VPC-native clusters, set secondary ranges
pods_secondary_range_name = "pods"
pods_secondary_cidr       = "10.20.0.0/16"
gke_pods_secondary_cidr   = "10.22.0.0/16"
pods_secondary_cidrs = {
  stage = "10.20.0.0/16"
  prod  = "10.21.0.0/16"
}
services_secondary_range_name = "services"
services_secondary_cidr       = "10.30.0.0/20"
gke_services_secondary_cidr   = "10.31.0.0/20"
services_secondary_cidrs = {
  stage = "10.30.0.0/20"
  prod  = "10.30.16.0/20"
}

# Images (GHCR)
backend_image     = "ghcr.io/longhuynh5713/pathplanner-backend"
worker_image      = "ghcr.io/longhuynh5713/pathplanner-worker"
frontend_image    = "ghcr.io/longhuynh5713/pathplanner-frontend"
default_image_tag = "latest"
backend_image_tag_by_env = {
  stage = "stage-latest"
  prod  = "prod-latest"
}
worker_image_tag_by_env = {
  stage = "stage-latest"
  prod  = "prod-latest"
}
default_image_pull_policy = "IfNotPresent"
image_pull_policy_by_env = {
  stage = "IfNotPresent"
  prod  = "IfNotPresent"
}

# GHCR (public) - no pull secret needed
ghcr_username          = ""
ghcr_token             = ""
image_pull_secret_name = ""

# Backend service
backend_container_port = 8080
backend_service_port   = 80
backend_health_path    = "/healthz"

# Routing
backend_path_prefix = "/api"
gateway_enabled     = true

# Frontend hosting
frontend_bucket_name = "transport-frontend-pathoptimizer-486102"
cdn_enabled          = true

# Redis (Memorystore Redis Cluster)
redis_mode                    = "cluster"
redis_shard_count             = 1
redis_replica_count           = 1
redis_node_type               = "REDIS_SHARED_CORE_NANO"
redis_auth_mode               = "AUTH_MODE_IAM_AUTH"
redis_transit_encryption_mode = "TRANSIT_ENCRYPTION_MODE_DISABLED"
psc_subnet_cidr               = "10.60.0.0/24"
redis_psc_connection_limit    = 10
redis_k8s_service_enabled     = true
redis_k8s_service_name        = "redis"

# App config (non-secret values)
google_maps_api_url       = "https://maps.googleapis.com/maps/api"
google_maps_tile_map_type = "roadmap"
google_maps_tile_size     = 256

cors_allowed_origins = ["https://<frontend-domain>"]
