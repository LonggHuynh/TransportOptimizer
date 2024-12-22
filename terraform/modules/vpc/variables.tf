variable "az_count" {
  type        = number
  description = "Number of Availability Zones to use."
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC."
}

variable "tags" {
  type        = string
  description = "Tags to associate with your resources."
}

variable "instance_tenancy" {
  type        = string
  description = "The VPC tenancy option."
}

variable "map_public_ip_on_launch" {
  type        = bool
  description = "When true, public subnets have a public IP by default."
}

variable "public_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets."
}

variable "private_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets."
}

variable "rt_route_cidr_block" {
  type        = string
  description = "Route CIDR block for route table"
}

variable "access_ip" {
  type        = string
  description = "Access IP or CIDR block for inbound SSH or HTTPS."
}
