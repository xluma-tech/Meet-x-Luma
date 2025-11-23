# Quick Start Guide - 15 Minutes to First Deployment

## Prerequisites (5 minutes)

### Install Required Tools
```bash
# macOS
brew install terraform kubectl helm awscli k6

# Linux
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform kubectl helm awscli k6

# Verify installations
terraform version  # Should be 1.6+
kubectl version --client  # Should be 1.28+
helm version  # Should be 3.12+
aws --version  # Should be 2.x
k6 version  # Should be 0.47+
```

### Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json
```

## Deploy Dev Environment (10 minutes)

### Step 1: Clone and Navigate
```bash
cd infrastructure
```

### Step 2: Configure Environment
```bash
# Copy example environment file
cp terraform/environments/dev/terraform.tfvars.example \
   terraform/environments/dev/terraform.tfvars

# Edit with your values
nano terraform/environments/dev/terraform.tfvars
```

**Required Variables**:
```hcl
region = "us-east-1"
environment = "dev"
cluster_name = "media-platform-dev"
vpc_cidr = "10.0.0.0/16"
```

### Step 3: Deploy Infrastructure
```bash
# Run automated deployment
./scripts/deploy.sh dev us-east-1
```

This script will:
1. ✅ Check prerequisites
2. ✅ Deploy VPC and networking (Terraform)
3. ✅ Deploy Kubernetes cluster (EKS)
4. ✅ Configure kubectl
5. ✅ Deploy base Kubernetes resources
6. ✅ Deploy Helm charts (LiveKit, Redis, etc.)
7. ✅ Verify deployment
8. ✅ Run smoke tests

**Expected Duration**: 8-10 minutes

### Step 4: Verify Deployment
```bash
# Check pods are running
kubectl get pods -n media-platform

# Expected output:
# NAME                           READY   STATUS    RESTARTS   AGE
# livekit-sfu-xxxxx             1/1     Running   0          2m
# redis-master-0                1/1     Running   0          3m
# signaling-xxxxx               1/1     Running   0          2m
# orchestrator-xxxxx            1/1     Running   0          2m

# Get service endpoints
kubectl get svc -n media-platform
```

## Test Your Deployment (5 minutes)

### Option 1: Quick Smoke Test
```bash
cd load-tests
./run-smoke-test.sh
```

### Option 2: Manual Test
```bash
# Port forward to signaling service
kubectl port-forward -n media-platform svc/signaling 8080:8080 &

# Test health endpoint
curl http://localhost:8080/health

# Expected: {"status":"ok","timestamp":"..."}
```

### Option 3: Access Grafana
```bash
# Port forward to Grafana
kubectl port-forward -n media-platform svc/grafana 3000:3000 &

# Open browser
open http://localhost:3000

# Login:
# Username: admin
# Password: (get from secret)
kubectl get secret -n media-platform grafana \
  -o jsonpath='{.data.admin-password}' | base64 -d
```

## Update Your Frontend (5 minutes)

### Step 1: Get Service Endpoints
```bash
# Get LiveKit SFU endpoint
export LIVEKIT_URL=$(kubectl get svc -n media-platform livekit-sfu \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "LiveKit URL: wss://$LIVEKIT_URL:7880"

# Get Signaling endpoint
export SIGNALING_URL=$(kubectl get svc -n media-platform signaling \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Signaling URL: wss://$SIGNALING_URL:8080"
```

### Step 2: Update Frontend Config
```bash
cd ../frontend

# Update config/backend.ts
cat > config/backend.ts << EOF
export const config = {
  livekitUrl: 'wss://$LIVEKIT_URL:7880',
  signalingUrl: 'wss://$SIGNALING_URL:8080',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};
EOF
```

### Step 3: Install LiveKit SDK
```bash
npm install livekit-client
```

### Step 4: Test Locally
```bash
npm run dev
# Open http://localhost:3000
# Create a meeting and test
```

## Common Issues & Solutions

### Issue: Terraform fails with "VPC limit exceeded"
**Solution**: Delete unused VPCs or request limit increase
```bash
aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,Tags[?Key==`Name`].Value|[0]]'
aws ec2 delete-vpc --vpc-id vpc-xxxxx
```

### Issue: Pods stuck in "Pending" state
**Solution**: Check node capacity
```bash
kubectl describe pod <pod-name> -n media-platform
kubectl get nodes
kubectl top nodes

# Scale node group if needed
aws eks update-nodegroup-config \
  --cluster-name media-platform-dev \
  --nodegroup-name sfu \
  --scaling-config minSize=3,maxSize=10,desiredSize=5
```

### Issue: LoadBalancer stuck in "Pending"
**Solution**: Check AWS Load Balancer Controller
```bash
# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=media-platform-dev
```

### Issue: Can't connect to cluster
**Solution**: Update kubeconfig
```bash
aws eks update-kubeconfig \
  --name media-platform-dev \
  --region us-east-1

# Verify
kubectl cluster-info
```

## Next Steps

### 1. Review Architecture
```bash
# Read detailed architecture
cat docs/architecture-detailed.md

# Review implementation guide
cat IMPLEMENTATION_GUIDE.md
```

### 2. Run Load Tests
```bash
cd load-tests
./run-full-test.sh
```

### 3. Setup Monitoring
```bash
# Access Grafana dashboards
kubectl port-forward -n media-platform svc/grafana 3000:3000

# Import dashboards from monitoring/grafana/dashboards/
```

### 4. Plan Production Deployment
```bash
# Review production checklist
cat docs/production-checklist.md

# Review cost model
cat docs/cost-model.csv
```

## Cleanup (When Done Testing)

### Delete Everything
```bash
# Delete Kubernetes resources
helm uninstall livekit-sfu -n media-platform
helm uninstall signaling -n media-platform
helm uninstall orchestrator -n media-platform
helm uninstall redis -n media-platform

# Delete infrastructure
cd terraform/environments/dev
terraform destroy

# Confirm deletion
aws eks list-clusters
aws ec2 describe-vpcs
```

### Partial Cleanup (Keep Infrastructure)
```bash
# Just delete Helm releases
helm list -n media-platform
helm uninstall <release-name> -n media-platform
```

## Cost Estimate for Dev Environment

| Resource | Cost/Hour | Cost/Day | Cost/Month |
|----------|-----------|----------|------------|
| EKS Control Plane | $0.10 | $2.40 | $73 |
| EC2 Instances (3x t3.medium) | $0.12 | $2.88 | $87 |
| NAT Gateway | $0.045 | $1.08 | $32 |
| Load Balancer | $0.025 | $0.60 | $18 |
| **Total** | **$0.29** | **$6.96** | **$210** |

**Tip**: Stop instances when not in use to save costs
```bash
# Scale down to 0
kubectl scale deployment --all --replicas=0 -n media-platform

# Scale node group to 0
aws eks update-nodegroup-config \
  --cluster-name media-platform-dev \
  --nodegroup-name sfu \
  --scaling-config minSize=0,maxSize=10,desiredSize=0
```

## Troubleshooting Commands

```bash
# Check pod logs
kubectl logs -f <pod-name> -n media-platform

# Describe pod (see events)
kubectl describe pod <pod-name> -n media-platform

# Get pod shell
kubectl exec -it <pod-name> -n media-platform -- /bin/sh

# Check resource usage
kubectl top pods -n media-platform
kubectl top nodes

# Check events
kubectl get events -n media-platform --sort-by='.lastTimestamp'

# Check service endpoints
kubectl get endpoints -n media-platform

# Test connectivity
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- /bin/bash
# Inside pod: curl http://livekit-sfu:7880/health
```

## Getting Help

### Documentation
- **Architecture**: `docs/architecture-detailed.md`
- **Implementation**: `IMPLEMENTATION_GUIDE.md`
- **Runbooks**: `docs/runbooks/`
- **Cost Model**: `docs/cost-model.csv`

### External Resources
- **LiveKit**: https://docs.livekit.io
- **Kubernetes**: https://kubernetes.io/docs
- **Terraform**: https://www.terraform.io/docs
- **AWS EKS**: https://docs.aws.amazon.com/eks

### Community
- **LiveKit Slack**: https://livekit.io/slack
- **Kubernetes Slack**: https://slack.k8s.io

---

**Congratulations!** 🎉 You've deployed your first SFU-based media platform.

**Next**: Review `IMPLEMENTATION_GUIDE.md` for the complete 8-week rollout plan.
