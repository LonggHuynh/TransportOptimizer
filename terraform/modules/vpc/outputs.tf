

output "private_subnet_ids" {
  description = "List of Private Subnet IDs"
  value = aws_subnet.private_transporteks_subnet.*.id
}


output "public_subnet_ids" {
  description = "List of Public Subnet IDs"
  value       = aws_subnet.public_transporteks_subnet.*.id
}

output "vpc_id" {
  value = aws_vpc.transporteks.id
}
