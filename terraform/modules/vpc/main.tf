locals {
  az_count = length(var.public_cidrs)
}

resource "aws_vpc" "transporteks" {
  cidr_block       = var.vpc_cidr
  instance_tenancy = var.instance_tenancy
  tags = {
    Name = var.tags
  }
}

resource "aws_internet_gateway" "transporteks_gw" {
  vpc_id = aws_vpc.transporteks.id

  tags = {
    Name = var.tags
  }
}

data "aws_availability_zones" "available" {}

resource "random_shuffle" "az_list" {
  input        = data.aws_availability_zones.available.names
  result_count = az_count
}

resource "aws_subnet" "public_transporteks_subnet" {
  count                   = az_count
  vpc_id                  = aws_vpc.transporteks.id
  cidr_block              = var.public_cidrs[count.index]
  availability_zone       = random_shuffle.az_list.result[count.index]
  map_public_ip_on_launch = true
  tags = {
    Name = "${var.tags}-public-${count.index}"
  }
}

resource "aws_subnet" "private_transporteks_subnet" {
  count             = az_count
  vpc_id            = aws_vpc.transporteks.id
  cidr_block        = var.private_cidrs[count.index]
  availability_zone = random_shuffle.az_list.result[count.index]
  tags = {
    Name = "${var.tags}-private-${count.index}"
  }
}

resource "aws_nat_gateway" "transporteks_nat_gw" {
  count         = az_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public_transporteks_subnet[count.index].id

  tags = {
    Name = var.tags
  }
}

resource "aws_eip" "nat" {
  count = az_count
}

resource "aws_route_table" "private_route_table" {
  count = az_count

  vpc_id = aws_vpc.transporteks.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.transporteks_nat_gw[count.index].id
  }

  tags = {
    Name = "${var.tags}-private"
  }
}

resource "aws_route_table_association" "private_association" {
  count          = az_count
  subnet_id      = aws_subnet.private_transporteks_subnet[count.index].id
  route_table_id = aws_route_table.private_route_table[count.index].id
}

resource "aws_default_route_table" "internal_transporteks_default" {
  default_route_table_id = aws_vpc.transporteks.default_route_table_id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.transporteks_gw.id
  }

  tags = {
    Name = "${var.tags}-default"
  }
}

resource "aws_route_table_association" "public_association" {
  count          = az_count
  subnet_id      = aws_subnet.public_transporteks_subnet[count.index].id
  route_table_id = aws_default_route_table.internal_transporteks_default.id
}
