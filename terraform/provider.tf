
terraform {
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "TransportAppEKS"

    workspaces {
      name = "AWSEKS"
    }
  }

  required_providers {

    random = {
      source  = "hashicorp/random"
      version = "3.1.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "= 3.74.2"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}


resource "random_string" "suffix" {
  length  = 5
  special = false
}
