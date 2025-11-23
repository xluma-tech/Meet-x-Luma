# VPC and Networking Module
# Provider-agnostic networking setup

variable "region" {
  description = "Cloud provider region"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["a", "b", "c"]
}

variable "provider_type" {
  description = "Cloud provider (aws, gcp, azure)"
  type        = string
  default     = "aws"
}

locals {
  common_tags = {
    Environment = var.environment
    Project     = "media-platform"
    ManagedBy   = "terraform"
    Region      = var.region
  }
  
  # Subnet calculations
  public_subnet_cidrs    = [for i, az in var.availability_zones : cidrsubnet(var.vpc_cidr, 4, i)]
  private_sfu_cidrs      = [for i, az in var.availability_zones : cidrsubnet(var.vpc_cidr, 4, i + 4)]
  private_control_cidrs  = [for i, az in var.availability_zones : cidrsubnet(var.vpc_cidr, 4, i + 8)]
  private_data_cidrs     = [for i, az in var.availability_zones : cidrsubnet(var.vpc_cidr, 4, i + 12)]
}

# VPC
resource "aws_vpc" "main" {
  count = var.provider_type == "aws" ? 1 : 0
  
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = merge(local.common_tags, {
    Name = "media-platform-${var.environment}-vpc"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  count = var.provider_type == "aws" ? 1 : 0
  
  vpc_id = aws_vpc.main[0].id
  
  tags = merge(local.common_tags, {
    Name = "media-platform-${var.environment}-igw"
  })
}

# Public Subnets (for Load Balancers, NAT Gateways)
resource "aws_subnet" "public" {
  count = var.provider_type == "aws" ? length(var.availability_zones) : 0
  
  vpc_id                  = aws_vpc.main[0].id
  cidr_block              = local.public_subnet_cidrs[count.index]
  availability_zone       = "${var.region}${var.availability_zones[count.index]}"
  map_public_ip_on_launch = true
  
  tags = merge(local.common_tags, {
    Name = "media-platform-${var.environment}-public-${var.availability_zones[count.index]}"
    Tier = "public"
    "kubernetes.io/role/elb" = "1"
  })
}

# Private Subnets - SFU/TURN (Media Plane)
resource "aws_subnet" "private_sfu" {
  count = var.provider_type == "aws" ? length(var.availability_zones) : 0
  
  vpc_id            = aws_vpc.main[0].id
  cidr_block        = local.private_sfu_cidrs[count.index]
  availability_zone = "${var.region}${var.availability_zones[count.index]}"
  
  tags = merge(local.common_tags, {
    Name = "media-platform-${var.environment}-sfu-${var.availability_zones[count.index]}"
    Tier = "private-sfu"
    "kubernetes.io/role/internal-elb" = "1"
  })
}

# Private Subnets - Control Plane (Signaling, Orchestrator)
resource "aws_subnet" "private_control" {
  count = var.provider_type == "aws" ? length(var.availability_zones) : 0
  
  vpc_id            = aws_vpc.main[0].id
  cidr_block        = local.private_control_cidrs[count.index]
  availability_zone = "${var.region}${var.availability_zones[count.index]}"
  
  tags = merge(local.common_tags, {
    Name = "media-platform-${var.environment}-control-${var.availability_zones[count.index]}"
    Tier = "private-control"
  })
}

# Private Subnets - Data (RDS, Redis, etcd)
resource "aws_subnet" "private_data" {
  count = var.provider_type == "aws" ? length(var.availability_zones) : 0
  
  vpc_id            = aws_vpc.main[0].id
  cidr_block        = local.private_data_cidrs[count.index]
  availability_zone = "${var.region}${var.availability_zones[count.index]}"
  
  tags = merge(local.common_tags, {
    Name = "media-platform-${var.environment}-data-${var.availability_zones[count.index]}"
    Tier = "private-data"
  })
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count = var.provider_type == "aws" ? length(var.availability_zones) : 0
  
  domain = "vpc"
  
  tags = merge(local.common_tags, {
    Name = "media-platform-${var.environment}-nat-eip-${var.availability_zones[count.index]}"
  })
  
  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways (one per AZ for high availability)
resource "aws_nat_gateway" "main" {
  count = var.provider_type == "aws" ? length(var.availability_zones) : 0
  
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  
  tags = merge(local.common_tags, {
    Name = "media-platform-${var.environment}-nat-${var.availability_zones[count.index]}"
  })
  
  depends_on = [aws_internet_gateway.main]
}

# Route Table - Public
resource "aws_route_table" "public" {
  count = var.provider_type == "aws" ? 1 : 0
  
  vpc_id = aws_vpc.main[0].id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main[0].id
  }
  
  tags = merge(local.common_tags, {
    Name = "media-platform-${var.environment}-public-rt"
  })
}

# Route Table Associations - Public
resource "aws_route_table_association" "public" {
  count = var.provider_type == "aws" ? length(var.availability_zones) : 0
  
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

# Route Tables - Private (one per AZ for NAT Gateway)
resource "aws_route_table" "private" {
  count = var.provider_type == "aws" ? length(var.availability_zones) : 0
  
  vpc_id = aws_vpc.main[0].id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }
  
  tags = merge(local.common_tags, {
    Name = "media-platform-${var.environment}-private-rt-${var.availability_zones[count.index]}"
  })
}

# Route Table Associations - Private SFU
resource "aws_route_table_association" "private_sfu" {
  count = var.provider_type == "aws" ? length(var.availability_zones) : 0
  
  subnet_id      = aws_subnet.private_sfu[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Route Table Associations - Private Control
resource "aws_route_table_association" "private_control" {
  count = var.provider_type == "aws" ? length(var.availability_zones) : 0
  
  subnet_id      = aws_subnet.private_control[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Route Table Associations - Private Data
resource "aws_route_table_association" "private_data" {
  count = var.provider_type == "aws" ? length(var.availability_zones) : 0
  
  subnet_id      = aws_subnet.private_data[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# VPC Flow Logs
resource "aws_flow_log" "main" {
  count = var.provider_type == "aws" ? 1 : 0
  
  iam_role_arn    = aws_iam_role.flow_logs[0].arn
  log_destination = aws_cloudwatch_log_group.flow_logs[0].arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main[0].id
  
  tags = merge(local.common_tags, {
    Name = "media-platform-${var.environment}-flow-logs"
  })
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  count = var.provider_type == "aws" ? 1 : 0
  
  name              = "/aws/vpc/media-platform-${var.environment}"
  retention_in_days = 7
  
  tags = local.common_tags
}

resource "aws_iam_role" "flow_logs" {
  count = var.provider_type == "aws" ? 1 : 0
  
  name = "media-platform-${var.environment}-flow-logs"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy" "flow_logs" {
  count = var.provider_type == "aws" ? 1 : 0
  
  name = "media-platform-${var.environment}-flow-logs"
  role = aws_iam_role.flow_logs[0].id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = var.provider_type == "aws" ? aws_vpc.main[0].id : null
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = var.vpc_cidr
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = var.provider_type == "aws" ? aws_subnet.public[*].id : []
}

output "private_sfu_subnet_ids" {
  description = "Private SFU subnet IDs"
  value       = var.provider_type == "aws" ? aws_subnet.private_sfu[*].id : []
}

output "private_control_subnet_ids" {
  description = "Private control plane subnet IDs"
  value       = var.provider_type == "aws" ? aws_subnet.private_control[*].id : []
}

output "private_data_subnet_ids" {
  description = "Private data subnet IDs"
  value       = var.provider_type == "aws" ? aws_subnet.private_data[*].id : []
}

output "nat_gateway_ips" {
  description = "NAT Gateway public IPs"
  value       = var.provider_type == "aws" ? aws_eip.nat[*].public_ip : []
}
