# Required SRE Skills for Operating Global Media Platform

## Overview

Operating a production-grade, globally distributed real-time media platform requires a specialized skill set combining traditional SRE practices with WebRTC-specific knowledge.

## Core SRE Skills (Must Have)

### 1. Kubernetes & Container Orchestration ⭐⭐⭐⭐⭐

**Why Critical**: Entire platform runs on Kubernetes

**Required Knowledge**:
- Pod lifecycle management
- Deployments, StatefulSets, DaemonSets
- Services, Ingress, Network Policies
- Horizontal Pod Autoscaler (HPA) with custom metrics
- Resource requests/limits tuning
- Node affinity and taints/tolerations
- PersistentVolumes and StorageClasses
- Helm charts and Kustomize
- kubectl proficiency

**Practical Skills**:
```bash
# Debug pod issues
kubectl describe pod <pod-name>
kubectl logs <pod-name> --previous
kubectl exec -it <pod-name> -- /bin/sh

# Check resource usage
kubectl top nodes
kubectl top pods

# Scale deployments
kubectl scale deployment livekit-sfu --replicas=10

# Port forwarding for debugging
kubectl port-forward svc/livekit-sfu 7880:7880
```

**Learning Resources**:
- Kubernetes Official Docs
- "Kubernetes in Action" book
- CKAD/CKA certification

### 2. Networking & WebRTC ⭐⭐⭐⭐⭐

**Why Critical**: Core technology of the platform

**Required Knowledge**:
- **UDP/TCP protocols**: Differences, use cases, performance characteristics
- **NAT traversal**: STUN, TURN, ICE
- **WebRTC stack**: 
  - Signaling (SDP offer/answer)
  - ICE candidate gathering
  - DTLS-SRTP encryption
  - RTP/RTCP protocols
- **Simulcast & SVC**: Multi-layer video encoding
- **Packet loss, jitter, RTT**: Understanding and debugging
- **Load balancing**: Layer 4 (NLB) for UDP traffic
- **DNS**: GeoDNS, latency-based routing, Anycast

**Practical Skills**:
```bash
# Test UDP connectivity
nc -u <host> <port>

# Check packet loss
ping -c 100 <host>

# Trace route
traceroute <host>

# Test TURN server
turnutils_uclient -v -u <username> -w <password> <turn-server>

# Capture WebRTC traffic
tcpdump -i any -w capture.pcap 'udp port 10000-60000'

# Analyze with Wireshark
wireshark capture.pcap
```

**Learning Resources**:
- WebRTC for the Curious (webrtcforthecurious.com)
- RFC 8825 (WebRTC Overview)
- LiveKit documentation

### 3. Cloud Platforms (AWS/GCP) ⭐⭐⭐⭐⭐

**Why Critical**: Infrastructure runs on cloud providers

**Required Knowledge**:
- **Compute**: EC2/Compute Engine, instance types, spot instances
- **Networking**: VPC, subnets, routing tables, NAT gateways, security groups
- **Load Balancing**: NLB/GLB for UDP, ALB/HTTPS for HTTP
- **DNS**: Route53/Cloud DNS, health checks, failover
- **Storage**: S3/GCS, lifecycle policies, cross-region replication
- **Databases**: RDS/Cloud SQL, Multi-AZ, read replicas
- **Caching**: ElastiCache/Memorystore (Redis)
- **IAM**: Roles, policies, service accounts
- **Monitoring**: CloudWatch/Cloud Monitoring

**Practical Skills**:
```bash
# AWS CLI
aws ec2 describe-instances
aws eks update-kubeconfig --name <cluster>
aws s3 sync s3://bucket /local/path

# GCP CLI
gcloud compute instances list
gcloud container clusters get-credentials <cluster>
gsutil cp gs://bucket/* /local/path
```

**Certifications**:
- AWS Solutions Architect Associate/Professional
- GCP Professional Cloud Architect

### 4. Infrastructure as Code (Terraform) ⭐⭐⭐⭐

**Why Critical**: All infrastructure is code

**Required Knowledge**:
- Terraform syntax and structure
- Modules and composition
- State management (remote state, locking)
- Workspaces for environments
- Provider-specific resources (AWS, GCP)
- Terraform Cloud/Enterprise (optional)

**Practical Skills**:
```bash
# Initialize
terraform init

# Plan changes
terraform plan -out=tfplan

# Apply changes
terraform apply tfplan

# Destroy resources
terraform destroy

# Import existing resources
terraform import aws_instance.example i-1234567890abcdef0

# Format code
terraform fmt -recursive

# Validate
terraform validate
```

**Learning Resources**:
- HashiCorp Learn
- "Terraform: Up & Running" book

### 5. Observability (Prometheus, Grafana) ⭐⭐⭐⭐⭐

**Why Critical**: Can't operate what you can't measure

**Required Knowledge**:
- **Prometheus**: 
  - PromQL query language
  - Metric types (counter, gauge, histogram, summary)
  - Recording rules
  - Alert rules
  - Service discovery
- **Grafana**: 
  - Dashboard creation
  - Variables and templating
  - Alerting
  - Data sources
- **Exporters**: Node exporter, custom exporters
- **Alertmanager**: Routing, grouping, silencing

**Practical Skills**:
```promql
# PromQL queries
rate(livekit_packet_loss_total[5m])
histogram_quantile(0.99, rate(livekit_room_join_duration_bucket[5m]))
sum(rate(container_cpu_usage_seconds_total[5m])) by (pod)

# Alert rules
- alert: HighPacketLoss
  expr: livekit_packet_loss_ratio > 0.05
  for: 5m
  annotations:
    summary: "High packet loss detected"
```

**Learning Resources**:
- Prometheus documentation
- "Prometheus: Up & Running" book
- Grafana tutorials

### 6. Linux System Administration ⭐⭐⭐⭐

**Why Critical**: Kernel tuning for high-performance networking

**Required Knowledge**:
- **Kernel tuning**: sysctl parameters for networking
- **Network stack**: Understanding of Linux networking
- **File descriptors**: ulimit tuning
- **Process management**: systemd, cgroups
- **Performance analysis**: top, htop, iotop, iftop
- **Debugging**: strace, tcpdump, netstat, ss

**Practical Skills**:
```bash
# Kernel tuning for SFU
sysctl -w net.core.rmem_max=134217728
sysctl -w net.core.wmem_max=134217728
sysctl -w net.ipv4.udp_rmem_min=16384

# Check file descriptor limits
ulimit -n

# Monitor network
iftop -i eth0
ss -tunap

# Check process
ps aux | grep livekit
top -p <pid>

# Trace system calls
strace -p <pid>
```

**Learning Resources**:
- "Linux Performance Tools" by Brendan Gregg
- Linux kernel documentation

## Advanced Skills (Nice to Have)

### 7. Programming (Go, Python) ⭐⭐⭐⭐

**Why Useful**: Custom services, automation, debugging

**Go** (Preferred for services):
- Signaling server
- Room orchestrator
- Custom exporters
- Load testing tools

**Python** (Useful for automation):
- Deployment scripts
- Data analysis
- Monitoring automation

**Practical Skills**:
```go
// Go: Simple HTTP server
package main

import (
    "net/http"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
    http.Handle("/metrics", promhttp.Handler())
    http.ListenAndServe(":8080", nil)
}
```

```python
# Python: Prometheus query
import requests

response = requests.get(
    'http://prometheus:9090/api/v1/query',
    params={'query': 'up'}
)
print(response.json())
```

### 8. Video/Audio Processing (FFmpeg) ⭐⭐⭐

**Why Useful**: Recording pipeline, transcoding

**Required Knowledge**:
- FFmpeg command-line usage
- Video codecs (H.264, VP8, VP9, AV1)
- Audio codecs (Opus, AAC)
- Container formats (MP4, WebM)
- Streaming protocols (RTMP, HLS, DASH)

**Practical Skills**:
```bash
# Record from RTP stream
ffmpeg -protocol_whitelist file,rtp,udp \
  -i stream.sdp \
  -c:v libx264 -c:a aac \
  output.mp4

# Composite multiple streams (grid layout)
ffmpeg -i input1.mp4 -i input2.mp4 -i input3.mp4 -i input4.mp4 \
  -filter_complex "[0:v][1:v][2:v][3:v]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0[v]" \
  -map "[v]" output.mp4

# Transcode to multiple bitrates
ffmpeg -i input.mp4 \
  -c:v libx264 -b:v 4M -s 1920x1080 output_1080p.mp4 \
  -c:v libx264 -b:v 2M -s 1280x720 output_720p.mp4 \
  -c:v libx264 -b:v 1M -s 854x480 output_480p.mp4
```

### 9. Distributed Systems (etcd, Redis) ⭐⭐⭐

**Why Useful**: State management, coordination

**etcd**:
- Key-value store
- Leader election
- Distributed locks
- Watch API

**Redis**:
- Caching
- Pub/sub
- Session storage
- Rate limiting

**Practical Skills**:
```bash
# etcd
etcdctl put /key value
etcdctl get /key
etcdctl watch /key

# Redis
redis-cli SET key value
redis-cli GET key
redis-cli PUBLISH channel message
redis-cli SUBSCRIBE channel
```

### 10. Security & Compliance ⭐⭐⭐⭐

**Why Important**: Protecting user data, regulatory compliance

**Required Knowledge**:
- TLS/SSL certificates (Let's Encrypt, cert-manager)
- Secrets management (Kubernetes Secrets, AWS Secrets Manager)
- RBAC (Kubernetes, IAM)
- Network policies
- Encryption at rest and in transit
- GDPR, HIPAA compliance basics
- Security auditing

**Practical Skills**:
```bash
# Generate TLS certificate
certbot certonly --standalone -d example.com

# Kubernetes secrets
kubectl create secret generic turn-secret \
  --from-literal=username=user \
  --from-literal=password=pass

# Check certificate expiry
openssl s_client -connect example.com:443 | openssl x509 -noout -dates
```

## Operational Skills

### 11. Incident Response ⭐⭐⭐⭐⭐

**Required Skills**:
- On-call rotation management
- Incident triage and prioritization
- Root cause analysis (RCA)
- Post-mortem writing
- Runbook creation and maintenance
- Communication during incidents

**Incident Response Process**:
1. **Detect**: Alert fires
2. **Triage**: Assess severity and impact
3. **Mitigate**: Stop the bleeding
4. **Resolve**: Fix the root cause
5. **Document**: Write post-mortem
6. **Improve**: Implement preventive measures

### 12. Capacity Planning ⭐⭐⭐⭐

**Required Skills**:
- Traffic forecasting
- Resource utilization analysis
- Cost modeling
- Scaling strategy
- Performance testing

**Practical Approach**:
```
1. Measure current usage
2. Project growth (linear, exponential)
3. Calculate required resources
4. Add safety margin (20%)
5. Plan scaling triggers
6. Estimate costs
```

### 13. Chaos Engineering ⭐⭐⭐

**Required Skills**:
- Designing chaos experiments
- Using chaos tools (Chaos Mesh, Litmus)
- Analyzing failure modes
- Building resilience

**Common Experiments**:
- Pod termination
- Network latency injection
- Packet loss simulation
- Resource exhaustion
- Region failure

## Learning Path

### Month 1: Foundations
- [ ] Kubernetes basics (CKAD course)
- [ ] WebRTC fundamentals (webrtcforthecurious.com)
- [ ] Cloud platform basics (AWS/GCP)

### Month 2: Infrastructure
- [ ] Terraform (HashiCorp Learn)
- [ ] Networking deep dive
- [ ] Load balancing and DNS

### Month 3: Observability
- [ ] Prometheus and PromQL
- [ ] Grafana dashboards
- [ ] Alert rule design

### Month 4: Advanced Topics
- [ ] Go programming basics
- [ ] etcd and distributed systems
- [ ] Security best practices

### Month 5: Operations
- [ ] Incident response training
- [ ] Capacity planning
- [ ] Chaos engineering

### Month 6: Specialization
- [ ] WebRTC deep dive
- [ ] Performance optimization
- [ ] Cost optimization

## Recommended Certifications

### Essential
1. **CKA** (Certified Kubernetes Administrator)
2. **AWS Solutions Architect** or **GCP Professional Cloud Architect**

### Valuable
3. **Prometheus Certified Associate**
4. **Terraform Associate**

### Nice to Have
5. **CKAD** (Certified Kubernetes Application Developer)
6. **CKS** (Certified Kubernetes Security Specialist)

## Team Structure

For a platform serving 10K concurrent users:

### Minimum Team (5 people)
- 2 Senior SREs (on-call rotation)
- 1 Platform Engineer (infrastructure)
- 1 Backend Engineer (services)
- 1 Frontend Engineer (client SDK)

### Ideal Team (8 people)
- 3 Senior SREs (on-call rotation)
- 2 Platform Engineers (infrastructure, automation)
- 2 Backend Engineers (services, APIs)
- 1 Frontend Engineer (client SDK)

### Responsibilities

**Senior SRE**:
- On-call rotation
- Incident response
- Performance optimization
- Capacity planning
- Runbook maintenance

**Platform Engineer**:
- Infrastructure as Code
- Kubernetes management
- CI/CD pipelines
- Monitoring and alerting

**Backend Engineer**:
- Signaling server
- Room orchestrator
- Recording workers
- API development

**Frontend Engineer**:
- Client SDK integration
- UI/UX optimization
- Browser compatibility
- Performance tuning

## Conclusion

Operating a global real-time media platform is challenging but rewarding. The key is continuous learning and staying up-to-date with:

1. **WebRTC standards**: New codecs, protocols
2. **Kubernetes updates**: New features, best practices
3. **Cloud provider services**: New offerings, pricing changes
4. **Security threats**: Vulnerabilities, patches
5. **Performance optimization**: New techniques, tools

**Remember**: You don't need to know everything on day one. Build knowledge incrementally, learn from incidents, and document everything.

## Resources

### Books
- "Site Reliability Engineering" (Google)
- "Kubernetes in Action" (Marko Lukša)
- "Terraform: Up & Running" (Yevgeniy Brikman)
- "Prometheus: Up & Running" (Brian Brazil)

### Online
- Kubernetes Documentation
- LiveKit Documentation
- WebRTC for the Curious
- AWS/GCP Documentation
- CNCF Landscape

### Communities
- Kubernetes Slack
- LiveKit Slack
- WebRTC community
- SRE Weekly newsletter
- CNCF events

Good luck on your SRE journey! 🚀
