module "eks" {
  source                  = "./modules/eks"
  subnet_ids              = module.vpc.aws_subnet
  vpc_id                  = module.vpc.vpc_id
  cluster_name            = "module-eks-${random_string.suffix.result}"
  endpoint_public_access  = true
  endpoint_private_access = true
  public_access_cidrs     = ["0.0.0.0/0"]
  node_group_name         = "transporteks"
  scaling_desired_size    = 2
  scaling_max_size        = 2
  scaling_min_size        = 1
  instance_types          = ["t3.small"]
}

module "vpc" {
  source                  = "./modules/vpc"
  tags                    = "transporteks"
  instance_tenancy        = "default"
  vpc_cidr                = "10.0.0.0/16"
  access_ip               = "0.0.0.0/0"
  public_sn_count         = 2
  public_cidrs            = ["10.0.1.0/24", "10.0.2.0/24"]
  private_cidrs           = ["10.0.3.0/24", "10.0.4.0/24"]
  map_public_ip_on_launch = true
  rt_route_cidr_block     = "0.0.0.0/0"

}
