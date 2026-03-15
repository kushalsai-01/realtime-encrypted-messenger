variable "aws_region" {
  default = "us-east-1"
}

variable "your_ip" {
  description = "Your IP for SSH access, format 1.2.3.4/32"
  type        = string
}
