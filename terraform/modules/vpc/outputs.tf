output "aws_public_subnet" {
  value = aws_subnet.public_transporteks_subnet.*.id
}

output "vpc_id" {
  value = aws_vpc.transporteks.id
}
