data "google_client_config" "default" {}

data "terraform_remote_state" "common" {
  backend = "remote"

  config = {
    organization = var.common_organization
    workspaces = {
      name = var.common_workspace_name
    }
  }
}

data "google_container_cluster" "gke" {
  name     = local.gke_cluster_name
  location = var.region
}
