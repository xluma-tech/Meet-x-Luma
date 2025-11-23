# Production-Grade Global Real-Time Media Platform

## Architecture Overview

This is a complete redesign from P2P mesh to a globally distributed SFU-based architecture supporting 10,000+ concurrent participants.

### Target Specifications
- **Concurrent Users**: 10,000 globally (baseline target)
- **Regions**: 5 POPs (us-east1, europe-west1, asia-south1, asia-southeast1, me-south1)
- **Latency Target**: ≤200ms median within region
- **Availability**: 99.9% uptime SLA
- **TURN Fallback**: Design for 20% worst-case (expect 10%)

### Technology Stack (Recommended)

**SFU Choice: LiveKit** ✅
- **Pros**: Production-ready, Go-based (high performance), built-in simulcast/SVC, excellent observability, active community, cloud-native
- **Cons**: Newer than Jitsi, smaller ecosystem than mediasoup
- **Alternatives**: 
  - mediasoup (Node/C++): More mature, flexible, requires more custom code
  - Jitsi Videobridge (Java): Battle-tested, heavier resource usage

**TURN: coturn (self-hosted)** ✅
- **Pros**: Cost-effective, full control, proven at scale
- **Cons**: Operational overhead
- **Alternative**: Twilio TURN (managed, $0.40/GB egress)

**Signaling: WebSocket over Go** ✅
- Stateless, horizontally scalable
- Redis for session state and pub/sub

**Orchestrator: Custom Go service** ✅
- Room placement and SFU binding
- etcd for distributed coordination

**Storage: S3-compatible** ✅
- Recordings and artifacts

**Monitoring: Prometheus + Grafana** ✅
- Custom metrics exporters for SFU stats

## Directory Structure

```
infrastructure/
├── README.md                          # This file
├── docs/
│   ├── architecture-diagram.png       # High-level architecture
│   ├── architecture-detailed.md       # Detailed design doc
│   ├── cost-model.xlsx               # Cost estimates
│   ├── runbooks/                     # Operational playbooks
│   └── sre-skills.md                 # Required skills
├── terraform/
│   ├── modules/                      # Reusable modules
│   │   ├── networking/              # VPC, subnets, NAT
│   │   ├── kubernetes/              # EKS/GKE clusters
│   │   ├── load-balancer/           # Edge LB (UDP/TCP/TLS)
│   │   └── dns/                     # GeoDNS/Route53
│   ├── environments/
│   │   ├── dev/                     # Development environment
│   │   ├── staging/                 # Staging environment
│   │   └── production/              # Production (multi-region)
│   └── providers/
│       ├── aws/                     # AWS-specific
│       └── gcp/                     # GCP-specific
├── kubernetes/
│   ├── base/                        # Base manifests
│   │   ├── namespace.yaml
│   │   ├── rbac.yaml
│   │   └── network-policies.yaml
│   ├── helm-charts/
│   │   ├── livekit-sfu/            # SFU deployment
│   │   ├── signaling/              # Signaling service
│   │   ├── orchestrator/           # Room orchestrator
│   │   ├── coturn/                 # TURN servers
│   │   ├── recorder/               # Recording workers
│   │   └── monitoring/             # Prometheus stack
│   └── overlays/
│       ├── dev/
│       ├── staging/
│       └── production/
├── monitoring/
│   ├── prometheus/
│   │   ├── rules/                  # Alert rules
│   │   └── exporters/              # Custom exporters
│   ├── grafana/
│   │   └── dashboards/             # Pre-built dashboards
│   └── alertmanager/
│       └── config.yaml
├── scripts/
│   ├── deploy.sh                   # Deployment automation
│   ├── scale-test.sh              # Load testing
│   ├── chaos-test.sh              # Chaos engineering
│   └── kernel-tuning.sh           # SFU node optimization
├── load-tests/
│   ├── k6/                        # k6 scripts
│   ├── webrtc-load/               # Custom WebRTC load tool
│   └── results/                   # Test results
└── security/
    ├── tls-certs/                 # Certificate management
    ├── turn-auth/                 # TURN credential rotation
    └── policies/                  # Security policies
```

## Quick Start - Deploy Test Environment

### Prerequisites
```bash
# Required tools
- kubectl (1.28+)
- helm (3.12+)
- terraform (1.6+)
- docker (24+)
- aws-cli or gcloud CLI
```

### 1. Deploy Single-Region Test POP

```bash
# Clone and setup
cd infrastructure

# Configure provider (AWS example)
export AWS_REGION=us-east-1
export AWS_PROFILE=your-profile

# Initialize Terraform
cd terraform/environments/dev
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Get kubeconfig
aws eks update-kubeconfig --name media-platform-dev --region us-east-1

# Deploy base infrastructure
kubectl apply -f ../../kubernetes/base/

# Deploy services via Helm
cd ../../kubernetes/helm-charts

# 1. Deploy LiveKit SFU
helm install livekit-sfu ./livekit-sfu \
  --namespace media-platform \
  --values ./livekit-sfu/values-dev.yaml

# 2. Deploy Signaling
helm install signaling ./signaling \
  --namespace media-platform \
  --values ./signaling/values-dev.yaml

# 3. Deploy Orchestrator
helm install orchestrator ./orchestrator \
  --namespace media-platform \
  --values ./orchestrator/values-dev.yaml

# 4. Deploy TURN
helm install coturn ./coturn \
  --namespace media-platform \
  --values ./coturn/values-dev.yaml

# 5. Deploy Monitoring
helm install monitoring ./monitoring \
  --namespace media-platform \
  --values ./monitoring/values-dev.yaml

# Verify deployment
kubectl get pods -n media-platform
kubectl get svc -n media-platform
```

### 2. Run Basic Smoke Test

```bash
# Port-forward to test locally
kubectl port-forward -n media-platform svc/signaling 8080:8080

# Run test client
cd load-tests/webrtc-load
./run-smoke-test.sh
```

### 3. Access Monitoring

```bash
# Grafana
kubectl port-forward -n media-platform svc/grafana 3000:3000
# Open http://localhost:3000 (admin/admin)

# Prometheus
kubectl port-forward -n media-platform svc/prometheus 9090:9090
# Open http://localhost:9090
```

## Production Deployment Checklist

### Pre-Production
- [ ] Security audit completed
- [ ] Load tests passed (10K concurrent users)
- [ ] Chaos tests passed (network failures, pod crashes)
- [ ] Monitoring dashboards configured
- [ ] Alerting rules tested
- [ ] Runbooks reviewed
- [ ] Cost model validated
- [ ] Backup/restore tested
- [ ] DR plan documented

### Production Rollout
- [ ] Deploy to staging environment
- [ ] Run full load test on staging
- [ ] Deploy to production (canary: 5% traffic)
- [ ] Monitor for 24 hours
- [ ] Increase to 25% traffic
- [ ] Monitor for 24 hours
- [ ] Increase to 100% traffic
- [ ] Post-deployment review

### Post-Production
- [ ] Enable all monitoring alerts
- [ ] Schedule chaos tests (monthly)
- [ ] Review cost reports (weekly)
- [ ] Capacity planning review (monthly)
- [ ] Security patches (as needed)

## Key Metrics & Thresholds

### SFU Performance
- CPU utilization: <75% (alert at 80%)
- Memory utilization: <80% (alert at 85%)
- Packet loss: <2% (alert at 3%)
- Jitter: <30ms (alert at 50ms)
- Active streams per SFU: <500 (scale at 400)

### Network
- Ingress bandwidth per SFU: <8 Gbps (10Gb NIC)
- Egress bandwidth per SFU: <8 Gbps
- Packets per second: <500K (alert at 600K)

### Application
- Room join time (p99): <5s (alert at 7s)
- WebSocket connection time (p99): <2s
- TURN fallback rate: <15% (alert at 20%)

### Capacity Planning
- Baseline: 50-100 participants per SFU (8 vCPU, 32GB RAM)
- Safety margin: 20% headroom
- Scale trigger: 80% of capacity

## Cost Model (10K Concurrent Users)

### Monthly Estimate (AWS)

| Component | Units | Unit Cost | Monthly Cost |
|-----------|-------|-----------|--------------|
| SFU Instances (c6i.2xlarge) | 25 | $250 | $6,250 |
| TURN Instances (c6i.xlarge) | 10 | $125 | $1,250 |
| Signaling (t3.medium) | 10 | $30 | $300 |
| Orchestrator (t3.small) | 3 | $15 | $45 |
| Load Balancers | 5 | $20 | $100 |
| Data Transfer (egress) | 500TB | $0.09/GB | $45,000 |
| S3 Storage (recordings) | 10TB | $0.023/GB | $230 |
| RDS (PostgreSQL) | 1 | $200 | $200 |
| ElastiCache (Redis) | 3 | $50 | $150 |
| CloudWatch/Monitoring | - | - | $500 |
| **Total** | | | **~$53,000/mo** |

**Per-user cost**: ~$5.30/month for active users
**TURN optimization**: Can reduce to ~$35K/mo with UDP optimization

## Architecture Decisions

### Why LiveKit over mediasoup?
1. **Production-ready**: Built for cloud-native deployment
2. **Performance**: Go-based, excellent concurrency
3. **Observability**: Built-in Prometheus metrics
4. **Maintenance**: Single binary, easier ops
5. **Community**: Active development, good docs

### Why self-hosted TURN over managed?
1. **Cost**: $0.09/GB vs $0.40/GB (4.4x savings)
2. **Control**: Custom routing, peering
3. **Scale**: Proven at 100K+ concurrent
4. **Trade-off**: Operational overhead (mitigated by automation)

### Why etcd over Redis for orchestrator?
1. **Consistency**: Strong consistency for room placement
2. **Leader election**: Built-in primitives
3. **Watch API**: Efficient state synchronization
4. **Trade-off**: Redis used for ephemeral session state

## Next Steps

1. **Review architecture docs**: `docs/architecture-detailed.md`
2. **Deploy dev environment**: Follow Quick Start above
3. **Run load tests**: `cd load-tests && ./run-full-test.sh`
4. **Review runbooks**: `docs/runbooks/`
5. **Plan production rollout**: Use checklist above

## Support & Troubleshooting

See `docs/runbooks/` for:
- SFU scaling issues
- TURN connectivity problems
- High latency debugging
- Packet loss investigation
- Cost optimization

## Required SRE Skills

See `docs/sre-skills.md` for detailed skill requirements.
