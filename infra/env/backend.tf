terraform {
  backend "remote" {
    organization = "LongHuynhh"

    workspaces {
      prefix = "transport-"
    }
  }
}
