locals {
  use_env_suffix = length(var.environments) > 0
  environments   = local.use_env_suffix ? var.environments : ["default"]
  gke_environment = var.gke_environment
  gke_env_suffix = local.gke_environment != "" ? "-${local.gke_environment}" : ""
  gke_output_key = local.gke_environment != "" ? local.gke_environment : "gke"

  env_suffix = {
    for env in local.environments : env => local.use_env_suffix ? "-${env}" : ""
  }

  name_prefix = {
    for env in local.environments :
    env => lower(replace("${var.cluster_name}${local.env_suffix[env]}", "_", "-"))
  }

  gke_name_prefix = lower(replace("${var.cluster_name}${local.gke_env_suffix}", "_", "-"))
  gke_vpc_name = "${var.vpc_name}${local.gke_env_suffix}"

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

  multi_env = length(var.environments) > 1

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

  artifact_registry_location = var.artifact_registry_location != null && var.artifact_registry_location != "" ? var.artifact_registry_location : var.region
}
