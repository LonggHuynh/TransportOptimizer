

output "aws_subnet" {
  value = concat(aws_subnet.private_transporteks_subnet.*.id, aws_subnet.public_transporteks_subnet.*.id)
}

output "vpc_id" {
  value = aws_vpc.transporteks.id
}
