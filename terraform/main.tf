terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_key_pair" "chat" {
  key_name   = "chat-server-key"
  public_key = file("~/.ssh/id_rsa.pub")
}

resource "aws_security_group" "chat_sg" {
  name        = "chat-server-sg"
  description = "Chat server security group"

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH from your IP only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "chat_server" {
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.chat.key_name
  vpc_security_group_ids = [aws_security_group.chat_sg.id]

  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    amazon-linux-extras install -y redis6
    systemctl enable redis
    systemctl start redis
    sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis.conf || true
    systemctl restart redis
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs nginx git
    npm install -g pm2
    systemctl enable nginx
    systemctl start nginx
  EOF

  tags = { Name = "chat-server" }
}

resource "aws_eip" "chat_ip" {
  instance = aws_instance.chat_server.id
  domain   = "vpc"
}

output "instance_public_ip" {
  value = aws_eip.chat_ip.public_ip
}

output "instance_public_dns" {
  value = aws_instance.chat_server.public_dns
}

