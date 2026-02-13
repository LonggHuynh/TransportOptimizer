# Core
project_id = "pathoptimizer-486102"
region     = "europe-north1"

environments = ["stage", "prod"]

# GKE
cluster_name = "transport"
gke_mode     = "autopilot"

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

# Frontend hosting
frontend_bucket_name = "transport-frontend-pathoptimizer-486102"
cdn_enabled          = true

# Redis
redis_mode                    = "cluster"
redis_shard_count             = 1
redis_replica_count           = 1
redis_node_type               = "REDIS_SHARED_CORE_NANO"
redis_auth_mode               = "AUTH_MODE_IAM_AUTH"
redis_transit_encryption_mode = "TRANSIT_ENCRYPTION_MODE_DISABLED"
psc_subnet_cidr               = "10.60.0.0/24"
redis_psc_connection_limit    = 10
