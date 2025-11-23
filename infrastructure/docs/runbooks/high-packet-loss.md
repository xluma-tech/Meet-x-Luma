# Runbook: High Packet Loss

## Severity: P1 (Critical)

## Symptoms
- Alert: `HighPacketLoss` firing
- Users reporting poor video/audio quality
- Prometheus metric: `livekit_packet_loss_ratio > 0.05` (5%)

## Impact
- Degraded user experience
- Choppy video/audio
- Potential call drops

## Diagnosis

### 1. Check Current Packet Loss
```bash
# Query Prometheus
curl -G 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=livekit_packet_loss_ratio'

# Or use Grafana dashboard: "SFU Performance"
```

### 2. Identify Affected SFUs
```bash
# Get packet loss per SFU pod
kubectl exec -n media-platform prometheus-0 -- \
  promtool query instant \
  'livekit_packet_loss_ratio' | grep -v "^#"

# Check pod status
kubectl get pods -n media-platform -l app=livekit-sfu
```

### 3. Check Network Metrics
```bash
# Check network errors on nodes
kubectl get nodes -o wide

# SSH to affected node and check
ssh node-ip
ifconfig eth0 | grep errors
netstat -s | grep -i error
```

### 4. Check SFU Resource Usage
```bash
# CPU and memory
kubectl top pods -n media-platform -l app=livekit-sfu

# Detailed metrics
kubectl exec -n media-platform <sfu-pod> -- \
  curl localhost:6789/metrics | grep -E "(cpu|memory|network)"
```

## Common Causes

### 1. Network Congestion
**Symptoms**: High bandwidth usage, network errors
**Check**:
```bash
# Check bandwidth per pod
kubectl exec -n media-platform prometheus-0 -- \
  promtool query instant \
  'rate(container_network_transmit_bytes_total[5m])'
```

**Resolution**:
- Scale up SFU instances to distribute load
- Check for bandwidth limits on nodes
- Verify network policies aren't blocking traffic

### 2. CPU Overload
**Symptoms**: CPU >90%, high system load
**Check**:
```bash
kubectl top pods -n media-platform -l app=livekit-sfu
```

**Resolution**:
```bash
# Scale up immediately
kubectl scale deployment livekit-sfu -n media-platform --replicas=10

# Or trigger HPA manually
kubectl autoscale deployment livekit-sfu \
  -n media-platform \
  --min=5 --max=20 --cpu-percent=70
```

### 3. Network Interface Issues
**Symptoms**: Interface errors, dropped packets
**Check**:
```bash
# On affected node
ethtool -S eth0 | grep -i error
dmesg | grep -i network
```

**Resolution**:
- Restart network interface (if safe)
- Drain node and replace
```bash
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
kubectl delete node <node-name>
```

### 4. Insufficient UDP Buffer Size
**Symptoms**: Packet loss under high load
**Check**:
```bash
# On SFU node
sysctl net.core.rmem_max
sysctl net.core.wmem_max
```

**Resolution**:
```bash
# Apply kernel tuning
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: sfu-sysctl
  namespace: media-platform
data:
  99-sfu-tuning.conf: |
    net.core.rmem_max = 134217728
    net.core.wmem_max = 134217728
    net.core.rmem_default = 16777216
    net.core.wmem_default = 16777216
EOF

# Restart SFU pods to apply
kubectl rollout restart deployment livekit-sfu -n media-platform
```

### 5. TURN Server Overload
**Symptoms**: High TURN usage, TURN server CPU high
**Check**:
```bash
# Check TURN metrics
kubectl exec -n media-platform prometheus-0 -- \
  promtool query instant \
  'coturn_allocations_total'
```

**Resolution**:
```bash
# Scale TURN servers
kubectl scale deployment coturn -n media-platform --replicas=5
```

## Immediate Mitigation

### Step 1: Scale SFU Instances (2 minutes)
```bash
# Quick scale up
kubectl scale deployment livekit-sfu -n media-platform --replicas=15

# Verify scaling
kubectl get pods -n media-platform -l app=livekit-sfu -w
```

### Step 2: Enable Bandwidth Adaptation (5 minutes)
```bash
# Update LiveKit config to be more aggressive with bandwidth adaptation
kubectl edit configmap livekit-sfu-config -n media-platform

# Add/update:
# video:
#   dynacast: true
#   adaptive_stream: true

# Restart pods
kubectl rollout restart deployment livekit-sfu -n media-platform
```

### Step 3: Reduce Video Quality Temporarily (if critical)
```bash
# Update simulcast config to lower bitrates
kubectl edit configmap livekit-sfu-config -n media-platform

# Reduce bitrates by 30%:
# - HIGH: 2500000 → 1750000
# - MEDIUM: 800000 → 560000
# - LOW: 300000 → 210000

kubectl rollout restart deployment livekit-sfu -n media-platform
```

## Long-term Resolution

### 1. Optimize Network Configuration
```bash
# Apply comprehensive network tuning
./scripts/kernel-tuning.sh

# Verify settings
kubectl exec -n media-platform <sfu-pod> -- sysctl -a | grep net.core
```

### 2. Upgrade Instance Types
```bash
# Update node group to use instances with better network performance
# Edit terraform/modules/kubernetes/main.tf
# Change: c6i.2xlarge → c6in.2xlarge (50 Gbps network)

cd terraform/environments/production
terraform plan
terraform apply
```

### 3. Implement QoS
```bash
# Apply network QoS policies
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: sfu-qos
  namespace: media-platform
spec:
  podSelector:
    matchLabels:
      app: livekit-sfu
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector: {}
    ports:
    - protocol: UDP
      port: 10000
      endPort: 60000
EOF
```

### 4. Monitor and Alert
```bash
# Add more granular alerts
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: sfu-packet-loss-detailed
  namespace: media-platform
spec:
  groups:
  - name: sfu-packet-loss
    interval: 30s
    rules:
    - alert: ModeratePacketLoss
      expr: livekit_packet_loss_ratio > 0.02
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Moderate packet loss detected"
    - alert: HighPacketLoss
      expr: livekit_packet_loss_ratio > 0.05
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "High packet loss detected"
EOF
```

## Verification

### 1. Check Packet Loss Improved
```bash
# Query current packet loss
kubectl exec -n media-platform prometheus-0 -- \
  promtool query instant \
  'livekit_packet_loss_ratio'

# Should be < 0.02 (2%)
```

### 2. Verify User Experience
```bash
# Check recent room quality metrics
kubectl logs -n media-platform -l app=livekit-sfu --tail=100 | grep quality
```

### 3. Monitor for 30 Minutes
```bash
# Watch metrics in Grafana
# Dashboard: "SFU Performance"
# Panel: "Packet Loss Over Time"
```

## Post-Incident

### 1. Document Root Cause
- What caused the packet loss?
- Which component was affected?
- How long did it last?

### 2. Update Monitoring
- Were alerts timely?
- Do we need more granular metrics?
- Should thresholds be adjusted?

### 3. Preventive Measures
- [ ] Review capacity planning
- [ ] Update autoscaling rules
- [ ] Improve network configuration
- [ ] Schedule load testing

## Escalation

If packet loss persists after 30 minutes:
1. **Escalate to**: Senior SRE on-call
2. **Consider**: Emergency maintenance window
3. **Communicate**: Status page update for users

## Related Runbooks
- [High Latency](./high-latency.md)
- [SFU Scaling Issues](./sfu-scaling.md)
- [Network Troubleshooting](./network-troubleshooting.md)

## References
- [LiveKit Performance Tuning](https://docs.livekit.io/guides/performance/)
- [Linux Network Tuning](https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt)
- [AWS Network Performance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enhanced-networking.html)
