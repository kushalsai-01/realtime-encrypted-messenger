terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.aws_region
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
    cidr_blocks = [var.your_ip]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "chat_server" {
  ami                    = "ami-0c02fb55956c7d316"
  instance_type          = "t2.micro"
  key_name               = aws_key_pair.chat.key_name
  vpc_security_group_ids = [aws_security_group.chat_sg.id]

  user_data = <<-EOF
    #!/bin/bash
    yum update -y
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

resource "aws_elasticache_cluster" "chat_redis" {
  cluster_id           = "chat-redis"
  engine               = "redis"
  node_type            = "cache.t2.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
}

output "server_ip" {
  value = aws_eip.chat_ip.public_ip
}

output "redis_host" {
  value = aws_elasticache_cluster.chat_redis.cache_nodes[0].address
}
