#!/bin/bash
# Production-Grade Media Platform Deployment Script
# Usage: ./deploy.sh [environment] [region]
# Example: ./deploy.sh dev us-east-1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Media Platform Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Region: ${YELLOW}$REGION${NC}"
echo ""

# Validate prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    local missing=0
    
    # Check required tools
    for tool in terraform kubectl helm aws; do
        if ! command -v $tool &> /dev/null; then
            echo -e "${RED}✗ $tool is not installed${NC}"
            missing=1
        else
            echo -e "${GREEN}✓ $tool is installed${NC}"
        fi
    done
    
    if [ $missing -eq 1 ]; then
        echo -e "${RED}Please install missing tools before continuing${NC}"
        exit 1
    fi
    
    echo ""
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    echo -e "${YELLOW}Deploying infrastructure...${NC}"
    
    cd "$ROOT_DIR/terraform/environments/$ENVIRONMENT"
    
    # Initialize Terraform
    echo "Initializing Terraform..."
    terraform init
    
    # Plan
    echo "Planning infrastructure changes..."
    terraform plan -out=tfplan
    
    # Confirm
    read -p "Apply these changes? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Deployment cancelled"
        exit 0
    fi
    
    # Apply
    echo "Applying infrastructure changes..."
    terraform apply tfplan
    
    # Get outputs
    export VPC_ID=$(terraform output -raw vpc_id)
    export CLUSTER_NAME=$(terraform output -raw cluster_name)
    export CLUSTER_ENDPOINT=$(terraform output -raw cluster_endpoint)
    
    echo -e "${GREEN}✓ Infrastructure deployed${NC}"
    echo ""
}

# Configure kubectl
configure_kubectl() {
    echo -e "${YELLOW}Configuring kubectl...${NC}"
    
    aws eks update-kubeconfig \
        --name "$CLUSTER_NAME" \
        --region "$REGION"
    
    # Verify connection
    if kubectl cluster-info &> /dev/null; then
        echo -e "${GREEN}✓ kubectl configured${NC}"
    else
        echo -e "${RED}✗ Failed to configure kubectl${NC}"
        exit 1
    fi
    
    echo ""
}

# Deploy Kubernetes base resources
deploy_k8s_base() {
    echo -e "${YELLOW}Deploying Kubernetes base resources...${NC}"
    
    cd "$ROOT_DIR/kubernetes"
    
    # Create namespace
    kubectl apply -f base/namespace.yaml
    
    # Apply RBAC
    kubectl apply -f base/rbac.yaml
    
    # Apply network policies
    kubectl apply -f base/network-policies.yaml
    
    echo -e "${GREEN}✓ Base resources deployed${NC}"
    echo ""
}

# Deploy Helm charts
deploy_helm_charts() {
    echo -e "${YELLOW}Deploying Helm charts...${NC}"
    
    cd "$ROOT_DIR/kubernetes/helm-charts"
    
    # 1. Deploy Redis (dependency for other services)
    echo "Deploying Redis..."
    helm upgrade --install redis bitnami/redis \
        --namespace media-platform \
        --set auth.enabled=true \
        --set auth.password="$(openssl rand -base64 32)" \
        --wait
    
    # 2. Deploy LiveKit SFU
    echo "Deploying LiveKit SFU..."
    helm upgrade --install livekit-sfu ./livekit-sfu \
        --namespace media-platform \
        --values ./livekit-sfu/values-$ENVIRONMENT.yaml \
        --wait
    
    # 3. Deploy Signaling Service
    echo "Deploying Signaling Service..."
    helm upgrade --install signaling ./signaling \
        --namespace media-platform \
        --values ./signaling/values-$ENVIRONMENT.yaml \
        --wait
    
    # 4. Deploy Orchestrator
    echo "Deploying Orchestrator..."
    helm upgrade --install orchestrator ./orchestrator \
        --namespace media-platform \
        --values ./orchestrator/values-$ENVIRONMENT.yaml \
        --wait
    
    # 5. Deploy TURN
    echo "Deploying TURN..."
    helm upgrade --install coturn ./coturn \
        --namespace media-platform \
        --values ./coturn/values-$ENVIRONMENT.yaml \
        --wait
    
    # 6. Deploy Monitoring
    echo "Deploying Monitoring Stack..."
    helm upgrade --install monitoring ./monitoring \
        --namespace media-platform \
        --values ./monitoring/values-$ENVIRONMENT.yaml \
        --wait
    
    echo -e "${GREEN}✓ Helm charts deployed${NC}"
    echo ""
}

# Verify deployment
verify_deployment() {
    echo -e "${YELLOW}Verifying deployment...${NC}"
    
    # Check pod status
    echo "Checking pod status..."
    kubectl get pods -n media-platform
    
    # Wait for all pods to be ready
    echo "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod \
        --all \
        -n media-platform \
        --timeout=300s
    
    # Check services
    echo "Checking services..."
    kubectl get svc -n media-platform
    
    # Get load balancer endpoints
    echo ""
    echo -e "${GREEN}Deployment endpoints:${NC}"
    kubectl get svc -n media-platform -o wide | grep LoadBalancer
    
    echo ""
    echo -e "${GREEN}✓ Deployment verified${NC}"
    echo ""
}

# Run smoke tests
run_smoke_tests() {
    echo -e "${YELLOW}Running smoke tests...${NC}"
    
    # Port forward to signaling service
    kubectl port-forward -n media-platform svc/signaling 8080:8080 &
    PF_PID=$!
    
    sleep 5
    
    # Test health endpoint
    if curl -f http://localhost:8080/health &> /dev/null; then
        echo -e "${GREEN}✓ Signaling service is healthy${NC}"
    else
        echo -e "${RED}✗ Signaling service health check failed${NC}"
    fi
    
    # Kill port forward
    kill $PF_PID
    
    echo ""
}

# Display access information
display_access_info() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Access Information:${NC}"
    echo ""
    
    # Get Grafana URL
    GRAFANA_URL=$(kubectl get svc -n media-platform grafana -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    echo -e "Grafana: http://$GRAFANA_URL:3000"
    echo -e "  Username: admin"
    echo -e "  Password: $(kubectl get secret -n media-platform grafana -o jsonpath='{.data.admin-password}' | base64 -d)"
    echo ""
    
    # Get Prometheus URL
    echo -e "Prometheus: kubectl port-forward -n media-platform svc/prometheus 9090:9090"
    echo ""
    
    # Get LiveKit URL
    LIVEKIT_URL=$(kubectl get svc -n media-platform livekit-sfu -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    echo -e "LiveKit SFU: $LIVEKIT_URL:7880"
    echo ""
    
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Access Grafana and verify dashboards"
    echo "2. Run load tests: cd load-tests && ./run-smoke-test.sh"
    echo "3. Update frontend configuration with new endpoints"
    echo "4. Deploy frontend application"
    echo ""
    
    echo -e "${GREEN}For troubleshooting, check:${NC}"
    echo "  kubectl logs -n media-platform <pod-name>"
    echo "  kubectl describe pod -n media-platform <pod-name>"
    echo ""
}

# Rollback function
rollback() {
    echo -e "${RED}Deployment failed. Rolling back...${NC}"
    
    # Rollback Helm releases
    helm rollback livekit-sfu -n media-platform || true
    helm rollback signaling -n media-platform || true
    helm rollback orchestrator -n media-platform || true
    helm rollback coturn -n media-platform || true
    helm rollback monitoring -n media-platform || true
    
    echo -e "${YELLOW}Rollback complete${NC}"
    exit 1
}

# Trap errors and rollback
trap rollback ERR

# Main execution
main() {
    check_prerequisites
    deploy_infrastructure
    configure_kubectl
    deploy_k8s_base
    deploy_helm_charts
    verify_deployment
    run_smoke_tests
    display_access_info
}

# Run main function
main

echo -e "${GREEN}Deployment script completed successfully!${NC}"
