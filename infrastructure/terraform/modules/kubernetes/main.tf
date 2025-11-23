# Kubernetes Cluster Module (EKS/GKE)

variable "cluster_name" {
  description = "Kubernetes cluster name"
  type        = string
}

variable "region" {
  description = "Cloud provider region"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for node groups"
  type        = list(string)
}

variable "provider_type" {
  description = "Cloud provider (aws, gcp)"
  type        = string
  default     = "aws"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

locals {
  common_tags = {
    Environment = var.environment
    Project     = "media-platform"
    ManagedBy   = "terraform"
  }
}

# EKS Cluster (AWS)
resource "aws_eks_cluster" "main" {
  count = var.provider_type == "aws" ? 1 : 0
  
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster[0].arn
  version  = var.kubernetes_version
  
  vpc_config {
    subnet_ids              = var.private_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }
  
  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  
  tags = merge(local.common_tags, {
    Name = var.cluster_name
  })
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_vpc_resource_controller
  ]
}

# EKS Cluster IAM Role
resource "aws_iam_role" "eks_cluster" {
  count = var.provider_type == "aws" ? 1 : 0
  
  name = "${var.cluster_name}-cluster-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  count = var.provider_type == "aws" ? 1 : 0
  
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster[0].name
}

resource "aws_iam_role_policy_attachment" "eks_vpc_resource_controller" {
  count = var.provider_type == "aws" ? 1 : 0
  
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.eks_cluster[0].name
}

# Node Groups

# SFU Node Group (High-performance instances)
resource "aws_eks_node_group" "sfu" {
  count = var.provider_type == "aws" ? 1 : 0
  
  cluster_name    = aws_eks_cluster.main[0].name
  node_group_name = "${var.cluster_name}-sfu"
  node_role_arn   = aws_iam_role.eks_node[0].arn
  subnet_ids      = var.private_subnet_ids
  
  instance_types = ["c6i.2xlarge"] # 8 vCPU, 16GB RAM, 10Gbps network
  
  scaling_config {
    desired_size = 3
    max_size     = 20
    min_size     = 2
  }
  
  update_config {
    max_unavailable = 1
  }
  
  labels = {
    role = "sfu"
    tier = "media-plane"
  }
  
  tags = merge(local.common_tags, {
    Name = "${var.cluster_name}-sfu-node"
    "k8s.io/cluster-autoscaler/enabled" = "true"
    "k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
  })
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy
  ]
}

# TURN Node Group
resource "aws_eks_node_group" "turn" {
  count = var.provider_type == "aws" ? 1 : 0
  
  cluster_name    = aws_eks_cluster.main[0].name
  node_group_name = "${var.cluster_name}-turn"
  node_role_arn   = aws_iam_role.eks_node[0].arn
  subnet_ids      = var.private_subnet_ids
  
  instance_types = ["c6i.xlarge"] # 4 vCPU, 8GB RAM
  
  scaling_config {
    desired_size = 2
    max_size     = 10
    min_size     = 2
  }
  
  update_config {
    max_unavailable = 1
  }
  
  labels = {
    role = "turn"
    tier = "media-plane"
  }
  
  tags = merge(local.common_tags, {
    Name = "${var.cluster_name}-turn-node"
    "k8s.io/cluster-autoscaler/enabled" = "true"
    "k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
  })
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy
  ]
}

# Control Plane Node Group
resource "aws_eks_node_group" "control" {
  count = var.provider_type == "aws" ? 1 : 0
  
  cluster_name    = aws_eks_cluster.main[0].name
  node_group_name = "${var.cluster_name}-control"
  node_role_arn   = aws_iam_role.eks_node[0].arn
  subnet_ids      = var.private_subnet_ids
  
  instance_types = ["t3.medium"] # 2 vCPU, 4GB RAM
  
  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 2
  }
  
  update_config {
    max_unavailable = 1
  }
  
  labels = {
    role = "control"
    tier = "control-plane"
  }
  
  tags = merge(local.common_tags, {
    Name = "${var.cluster_name}-control-node"
    "k8s.io/cluster-autoscaler/enabled" = "true"
    "k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
  })
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy
  ]
}

# EKS Node IAM Role
resource "aws_iam_role" "eks_node" {
  count = var.provider_type == "aws" ? 1 : 0
  
  name = "${var.cluster_name}-node-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_node_policy" {
  count = var.provider_type == "aws" ? 1 : 0
  
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node[0].name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  count = var.provider_type == "aws" ? 1 : 0
  
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node[0].name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  count = var.provider_type == "aws" ? 1 : 0
  
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node[0].name
}

# OIDC Provider for IRSA (IAM Roles for Service Accounts)
data "tls_certificate" "eks" {
  count = var.provider_type == "aws" ? 1 : 0
  
  url = aws_eks_cluster.main[0].identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  count = var.provider_type == "aws" ? 1 : 0
  
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks[0].certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main[0].identity[0].oidc[0].issuer
  
  tags = local.common_tags
}

# Cluster Autoscaler IAM Policy
resource "aws_iam_policy" "cluster_autoscaler" {
  count = var.provider_type == "aws" ? 1 : 0
  
  name        = "${var.cluster_name}-cluster-autoscaler"
  description = "Policy for cluster autoscaler"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeAutoScalingInstances",
          "autoscaling:DescribeLaunchConfigurations",
          "autoscaling:DescribeScalingActivities",
          "autoscaling:DescribeTags",
          "ec2:DescribeInstanceTypes",
          "ec2:DescribeLaunchTemplateVersions"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "autoscaling:SetDesiredCapacity",
          "autoscaling:TerminateInstanceInAutoScalingGroup",
          "ec2:DescribeImages",
          "ec2:GetInstanceTypesFromInstanceRequirements",
          "eks:DescribeNodegroup"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = local.common_tags
}

# EBS CSI Driver IAM Policy
resource "aws_iam_policy" "ebs_csi_driver" {
  count = var.provider_type == "aws" ? 1 : 0
  
  name        = "${var.cluster_name}-ebs-csi-driver"
  description = "Policy for EBS CSI driver"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateSnapshot",
          "ec2:AttachVolume",
          "ec2:DetachVolume",
          "ec2:ModifyVolume",
          "ec2:DescribeAvailabilityZones",
          "ec2:DescribeInstances",
          "ec2:DescribeSnapshots",
          "ec2:DescribeTags",
          "ec2:DescribeVolumes",
          "ec2:DescribeVolumesModifications"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateTags"
        ]
        Resource = [
          "arn:aws:ec2:*:*:volume/*",
          "arn:aws:ec2:*:*:snapshot/*"
        ]
        Condition = {
          StringEquals = {
            "ec2:CreateAction" = [
              "CreateVolume",
              "CreateSnapshot"
            ]
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DeleteTags"
        ]
        Resource = [
          "arn:aws:ec2:*:*:volume/*",
          "arn:aws:ec2:*:*:snapshot/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateVolume"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            "aws:RequestTag/ebs.csi.aws.com/cluster" = "true"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateVolume"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            "aws:RequestTag/CSIVolumeName" = "*"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DeleteVolume"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            "ec2:ResourceTag/ebs.csi.aws.com/cluster" = "true"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DeleteVolume"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            "ec2:ResourceTag/CSIVolumeName" = "*"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DeleteVolume"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            "ec2:ResourceTag/kubernetes.io/created-for/pvc/name" = "*"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DeleteSnapshot"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            "ec2:ResourceTag/CSIVolumeSnapshotName" = "*"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DeleteSnapshot"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            "ec2:ResourceTag/ebs.csi.aws.com/cluster" = "true"
          }
        }
      }
    ]
  })
  
  tags = local.common_tags
}

# Outputs
output "cluster_id" {
  description = "Kubernetes cluster ID"
  value       = var.provider_type == "aws" ? aws_eks_cluster.main[0].id : null
}

output "cluster_endpoint" {
  description = "Kubernetes cluster endpoint"
  value       = var.provider_type == "aws" ? aws_eks_cluster.main[0].endpoint : null
}

output "cluster_certificate_authority_data" {
  description = "Kubernetes cluster CA certificate"
  value       = var.provider_type == "aws" ? aws_eks_cluster.main[0].certificate_authority[0].data : null
  sensitive   = true
}

output "cluster_oidc_issuer_url" {
  description = "OIDC issuer URL"
  value       = var.provider_type == "aws" ? aws_eks_cluster.main[0].identity[0].oidc[0].issuer : null
}

output "cluster_autoscaler_policy_arn" {
  description = "Cluster autoscaler IAM policy ARN"
  value       = var.provider_type == "aws" ? aws_iam_policy.cluster_autoscaler[0].arn : null
}

output "ebs_csi_driver_policy_arn" {
  description = "EBS CSI driver IAM policy ARN"
  value       = var.provider_type == "aws" ? aws_iam_policy.ebs_csi_driver[0].arn : null
}
