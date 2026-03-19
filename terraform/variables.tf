variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "my_ip" {
  type        = string
  description = "Your IP CIDR for SSH access, e.g. 1.2.3.4/32"
}
