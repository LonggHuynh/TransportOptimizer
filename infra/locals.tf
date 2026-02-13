locals {
  workspace_name           = terraform.workspace
  workspace_suffix         = startswith(local.workspace_name, "transport-") ? trimprefix(local.workspace_name, "transport-") : local.workspace_name
  split_workspace_suffixes = toset(["common", "stage", "prod"])
  app_workspace_suffixes   = toset(["stage", "prod"])
  using_split_workspaces   = contains(local.split_workspace_suffixes, local.workspace_suffix)
  is_common_workspace      = local.workspace_suffix == "common"
  is_env_workspace         = contains(local.app_workspace_suffixes, local.workspace_suffix)
  manage_foundation        = local.is_common_workspace || !local.using_split_workspaces
  manage_app               = local.is_env_workspace || !local.using_split_workspaces
  configured_environments  = length(var.environments) > 0 ? var.environments : ["default"]
  workspace_environments   = local.is_env_workspace ? [local.workspace_suffix] : local.configured_environments
  use_env_suffix           = length(local.workspace_environments) > 0
  environments             = local.use_env_suffix ? local.workspace_environments : ["default"]
  foundation_environments  = local.manage_foundation ? toset(local.environments) : toset([])
  application_environments = local.manage_app ? toset(local.environments) : toset([])
  gke_environment          = var.gke_environment
  gke_env_suffix           = local.gke_environment != "" ? "-${local.gke_environment}" : ""
  gke_output_key           = local.gke_environment != "" ? local.gke_environment : "gke"

  env_suffix = {
    for env in local.environments : env => local.use_env_suffix ? "-${env}" : ""
  }

  name_prefix = {
    for env in local.environments :
    env => lower(replace("${var.cluster_name}${local.env_suffix[env]}", "_", "-"))
  }

  gke_name_prefix = lower(replace("${var.cluster_name}${local.gke_env_suffix}", "_", "-"))
  gke_vpc_name    = "${var.vpc_name}${local.gke_env_suffix}"

  subnet_name = {
    for env in local.environments :
    env => "${var.subnet_name}${local.env_suffix[env]}"
  }

  gke_subnet_name = "${var.gke_subnet_name}${local.gke_env_suffix}"

  cluster_name = {
    for env in local.environments :
    env => "${var.cluster_name}${local.env_suffix[env]}"
  }
  gke_cluster_name = "${var.cluster_name}${local.gke_env_suffix}"

  frontend_lb_base = {
    for env in local.environments :
    env => var.frontend_lb_name != "" ? "${var.frontend_lb_name}${local.env_suffix[env]}" : "${local.name_prefix[env]}-frontend"
  }

  frontend_ip_name = {
    for env, base in local.frontend_lb_base : env => "${base}-ip"
  }

  frontend_url_map_name = {
    for env, base in local.frontend_lb_base : env => "${base}-url-map"
  }

  frontend_http_proxy_name = {
    for env, base in local.frontend_lb_base : env => "${base}-http-proxy"
  }

  frontend_forwarding_rule_name = {
    for env, base in local.frontend_lb_base : env => "${base}-http"
  }

  frontend_backend_bucket_name = {
    for env, base in local.frontend_lb_base : env => "${base}-backend"
  }

  frontend_bucket_name = {
    for env in local.environments :
    env => lookup(
      var.frontend_bucket_names,
      env,
      var.frontend_bucket_name != "" ? "${var.frontend_bucket_name}${local.env_suffix[env]}" : ""
    )
  }

  frontend_bucket_names_ok = alltrue([
    for env in local.environments : local.frontend_bucket_name[env] != ""
  ])

  frontend_bucket_names_unique = length(distinct([
    for env in local.environments : local.frontend_bucket_name[env]
  ])) == length(local.environments)

  backend_sa_id = {
    for env in local.environments :
    env => substr("${local.name_prefix[env]}-backend", 0, 30)
  }

  worker_sa_id = {
    for env in local.environments :
    env => substr("${local.name_prefix[env]}-worker", 0, 30)
  }

  subnet_cidr = {
    for env in local.environments :
    env => lookup(var.subnet_cidrs, env, var.subnet_cidr)
  }

  pods_secondary_cidr = {
    for env in local.environments :
    env => lookup(var.pods_secondary_cidrs, env, var.pods_secondary_cidr)
  }

  services_secondary_cidr = {
    for env in local.environments :
    env => lookup(var.services_secondary_cidrs, env, var.services_secondary_cidr)
  }

  multi_env = length(local.environments) > 1

  subnet_cidrs_ok = !local.multi_env || (
    alltrue([for env in local.environments : contains(keys(var.subnet_cidrs), env)]) &&
    length(distinct([for env in local.environments : local.subnet_cidr[env]])) == length(local.environments)
  )

  pods_secondary_cidrs_ok = !local.multi_env || (
    alltrue([for env in local.environments : contains(keys(var.pods_secondary_cidrs), env)]) &&
    length(distinct([for env in local.environments : local.pods_secondary_cidr[env]])) == length(local.environments)
  )

  services_secondary_cidrs_ok = !local.multi_env || (
    alltrue([for env in local.environments : contains(keys(var.services_secondary_cidrs), env)]) &&
    length(distinct([for env in local.environments : local.services_secondary_cidr[env]])) == length(local.environments)
  )

  k8s_namespace = {
    for env in local.environments :
    env => local.name_prefix[env]
  }

  backend_k8s_service_account = "backend"
  worker_k8s_service_account  = "worker"

  aspnetcore_environment = {
    for env in local.environments :
    env => env == "prod" ? "Production" : env == "stage" ? "Staging" : "Production"
  }

  backend_service_account_email_by_env = {
    for env in local.environments :
    env => "${local.backend_sa_id[env]}@${var.project_id}.iam.gserviceaccount.com"
  }

  worker_service_account_email_by_env = {
    for env in local.environments :
    env => "${local.worker_sa_id[env]}@${var.project_id}.iam.gserviceaccount.com"
  }

  redis_host_by_env = local.manage_foundation ? {
    for env in local.environments :
    env => google_redis_cluster.redis[env].discovery_endpoints[0].address
    } : {
    for env in local.environments :
    env => var.redis_k8s_service_name
  }

  redis_port_by_env = local.manage_foundation ? {
    for env in local.environments :
    env => google_redis_cluster.redis[env].discovery_endpoints[0].port
    } : {
    for env in local.environments :
    env => var.redis_service_port
  }

  redis_endpoint_lookup_supported = local.manage_foundation || var.redis_k8s_service_enabled

  redis_app_host_by_env = {
    for env in local.environments :
    env => var.redis_k8s_service_enabled ? var.redis_k8s_service_name : local.redis_host_by_env[env]
  }

  redis_endpoint_by_env = {
    for env in local.environments :
    env => "${local.redis_app_host_by_env[env]}:${local.redis_port_by_env[env]}"
  }

  ghcr_credentials_provided        = var.ghcr_username != "" && var.ghcr_token != ""
  effective_image_pull_secret_name = var.image_pull_secret_name != "" ? var.image_pull_secret_name : (local.ghcr_credentials_provided ? "ghcr" : "")
  google_maps_api_key_provided     = var.google_maps_api_key != ""
}
