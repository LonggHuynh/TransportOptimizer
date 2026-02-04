# Core
project_id = "pathoptimizer-486102"
region     = "europe-north1"

environments = ["stage", "prod"]

# GKE
cluster_name = "transport"
gke_mode     = "autopilot" # autopilot | standard

# Network
vpc_name     = "transport-vpc"
subnet_name  = "transport-subnet"
subnet_cidr  = "10.10.0.0/20"
gke_subnet_name  = "transport-gke-subnet"
gke_subnet_cidr  = "10.11.0.0/20"
subnet_cidrs = {
  stage = "10.10.0.0/20"
  prod  = "10.10.16.0/20"
}
# If using VPC-native clusters, set secondary ranges
pods_secondary_range_name     = "pods"
pods_secondary_cidr           = "10.20.0.0/16"
gke_pods_secondary_cidr       = "10.22.0.0/16"
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
backend_image = "ghcr.io/longghuynh/transport-backend:latest"
worker_image  = "ghcr.io/longghuynh/transport-worker:latest"

# Backend service
backend_container_port = 8080
backend_service_port   = 80
backend_health_path    = "/healthz"

# Routing
backend_path_prefix = "/api"

# Frontend hosting
frontend_bucket_name = "transport-frontend-pathoptimizer-486102"
cdn_enabled          = true

# Redis
redis_mode = "in-cluster" # memorystore | in-cluster
redis_host = "redis-master.redis.svc.cluster.local" # update if release/name differs
redis_port = 6379
redis_chart_repository = "https://charts.bitnami.com/bitnami"
redis_chart_version    = "16.11.3"
redis_image_repository = "bitnamilegacy/redis" # Bitnami legacy registry for old tags
redis_image_tag        = "" # empty uses chart default

# App config (non-secret values)
mapbox_api_url                      = "https://api.mapbox.com"
mapbox_tile_style_id                = "mapbox/streets-v12"
mapbox_tile_resolution              = "low"
mapbox_tile_size                    = 256
mapbox_geocode_cache_minutes        = 1440
mapbox_geocode_failure_cache_minutes = 10
mapbox_directions_profile           = "driving"
mapbox_matrix_profile               = "driving"

cors_allowed_origins = ["https://<frontend-domain>"]
