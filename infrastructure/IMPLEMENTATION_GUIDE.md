# Production SFU Architecture - Implementation Guide

## Executive Summary

This document provides a complete implementation plan to migrate your current P2P mesh WebRTC architecture to a production-grade, globally distributed SFU-based platform capable of supporting 10,000+ concurrent users.

**Timeline**: 8 weeks
**Estimated Cost**: ~$53,000/month for 10K concurrent users
**Team Required**: 3-4 SREs, 2-3 Backend Engineers, 1-2 Frontend Engineers

## What's Been Created

### 1. Documentation
- ✅ Architecture overview (README.md)
- ✅ Detailed technical design (docs/architecture-detailed.md)
- ✅ This implementation guide

### 2. Infrastructure as Code
- ✅ Terraform modules for networking (VPC, subnets, NAT, routing)
- ✅ Terraform modules for Kubernetes (EKS/GKE clusters, node groups)
- ✅ Helm charts for LiveKit SFU deployment
- 🔄 Additional modules needed (see below)

### 3. What Still Needs to Be Built
The following components need to be created to complete the implementation:

#### Infrastructure (Terraform)
- [ ] Load balancer module (NLB/GLB for UDP/TCP/TLS)
- [ ] DNS module (Route53/Cloud DNS with GeoDNS)
- [ ] RDS/CloudSQL module (PostgreSQL for metadata)
- [ ] ElastiCache/Memorystore module (Redis for sessions)
- [ ] S3/GCS module (recordings storage)
- [ ] Environment-specific configurations (dev/staging/production)

#### Kubernetes/Helm Charts
- [ ] Signaling service (WebSocket server)
- [ ] Room orchestrator (Go service)
- [ ] coturn (TURN server)
- [ ] Recording workers (FFmpeg-based)
- [ ] Monitoring stack (Prometheus, Grafana, Alertmanager)
- [ ] Service mesh (Istio/Linkerd - optional but recommended)

#### Application Code
- [ ] Signaling server (Go/Node.js)
- [ ] Room orchestrator service (Go)
- [ ] TURN credential rotation service
- [ ] Recording worker service
- [ ] Client SDK migration (SimplePeer → LiveKit SDK)

#### Observability
- [ ] Prometheus exporters for custom metrics
- [ ] Grafana dashboards (5 dashboards as specified)
- [ ] Alert rules and runbooks
- [ ] Log aggregation setup (ELK/Cloud Logging)

#### Testing & Validation
- [ ] Load testing framework (k6 + custom WebRTC load tool)
- [ ] Chaos engineering tests
- [ ] Integration tests
- [ ] Performance benchmarks

#### Security
- [ ] TLS certificate automation (cert-manager)
- [ ] TURN credential rotation
- [ ] Secrets management
- [ ] Network policies
- [ ] Security audit

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

#### Week 1: Infrastructure Setup
**Goal**: Deploy single-region development environment

**Tasks**:
1. **Day 1-2**: Complete Terraform modules
   ```bash
   # Create remaining modules
   - terraform/modules/load-balancer/
   - terraform/modules/dns/
   - terraform/modules/rds/
   - terraform/modules/redis/
   - terraform/modules/s3/
   ```

2. **Day 3-4**: Deploy dev environment
   ```bash
   cd infrastructure/terraform/environments/dev
   terraform init
   terraform plan
   terraform apply
   ```

3. **Day 5**: Deploy Kubernetes cluster and base services
   ```bash
   # Get kubeconfig
   aws eks update-kubeconfig --name media-platform-dev
   
   # Deploy base
   kubectl apply -f kubernetes/base/
   
   # Deploy LiveKit SFU
   helm install livekit-sfu kubernetes/helm-charts/livekit-sfu/
   ```

**Deliverables**:
- ✅ Working dev environment in one region
- ✅ LiveKit SFU running and accessible
- ✅ Basic monitoring (Prometheus + Grafana)

#### Week 2: Control Plane Development
**Goal**: Build and deploy signaling and orchestrator services

**Tasks**:
1. **Day 1-3**: Develop signaling service
   ```go
   // services/signaling/main.go
   // WebSocket server for WebRTC signaling
   // - JWT authentication
   // - Room join/leave
   // - Offer/answer/ICE candidate relay
   // - Redis pub/sub for multi-instance
   ```

2. **Day 4-5**: Develop room orchestrator
   ```go
   // services/orchestrator/main.go
   // Room placement and SFU binding
   // - Geo-based routing
   // - Load-based placement
   // - Room sharding for large meetings
   // - etcd for state management
   ```

**Deliverables**:
- ✅ Signaling service deployed
- ✅ Orchestrator service deployed
- ✅ End-to-end test: client → signaling → SFU

### Phase 2: Media Plane (Weeks 3-4)

#### Week 3: TURN and Media Optimization
**Goal**: Deploy TURN servers and optimize media delivery

**Tasks**:
1. **Day 1-2**: Deploy coturn
   ```bash
   helm install coturn kubernetes/helm-charts/coturn/
   ```

2. **Day 3-4**: Implement TURN credential rotation
   ```go
   // services/turn-auth/main.go
   // HMAC-based short-lived credentials
   // - 24-hour TTL
   // - Automatic rotation every 12 hours
   ```

3. **Day 5**: Performance tuning
   ```bash
   # Apply kernel tuning
   ./scripts/kernel-tuning.sh
   
   # Test UDP performance
   iperf3 -c <sfu-ip> -u -b 10G
   ```

**Deliverables**:
- ✅ TURN servers deployed and tested
- ✅ Credential rotation working
- ✅ Performance benchmarks documented

#### Week 4: Recording and Storage
**Goal**: Implement recording pipeline

**Tasks**:
1. **Day 1-3**: Develop recording workers
   ```go
   // services/recorder/main.go
   // FFmpeg-based recording
   // - Subscribe to SFU streams
   // - Composite video (grid layout)
   // - Upload to S3
   ```

2. **Day 4-5**: Storage and CDN setup
   ```bash
   # Configure S3 buckets
   # Setup CloudFront/CDN
   # Implement lifecycle policies
   ```

**Deliverables**:
- ✅ Recording workers deployed
- ✅ Recordings stored in S3
- ✅ CDN for playback

### Phase 3: Client Migration (Weeks 5-6)

#### Week 5: Client SDK Integration
**Goal**: Migrate frontend from SimplePeer to LiveKit SDK

**Tasks**:
1. **Day 1-2**: Install LiveKit SDK
   ```bash
   cd frontend
   npm install livekit-client
   ```

2. **Day 3-5**: Rewrite room page
   ```typescript
   // frontend/app/room/[id]/page.tsx
   import { Room, RoomEvent, Track } from 'livekit-client';
   
   // Replace SimplePeer logic with LiveKit SDK
   // - Connect to room
   // - Publish local tracks
   // - Subscribe to remote tracks
   // - Handle simulcast layers
   ```

**Deliverables**:
- ✅ Client using LiveKit SDK
- ✅ Feature parity with P2P version
- ✅ Simulcast working

#### Week 6: Testing and Optimization
**Goal**: Load testing and performance optimization

**Tasks**:
1. **Day 1-2**: Load testing
   ```bash
   cd load-tests
   ./run-full-test.sh --users 1000 --duration 30m
   ```

2. **Day 3-4**: Performance optimization
   - Tune SFU parameters
   - Optimize bandwidth usage
   - Reduce latency

3. **Day 5**: A/B testing setup
   - Deploy to staging
   - Route 10% traffic to new architecture
   - Monitor metrics

**Deliverables**:
- ✅ Load test results (1000+ concurrent users)
- ✅ Performance optimizations applied
- ✅ A/B test running

### Phase 4: Production Rollout (Weeks 7-8)

#### Week 7: Multi-Region Deployment
**Goal**: Deploy to all 5 regions

**Tasks**:
1. **Day 1-2**: Deploy to production regions
   ```bash
   # Deploy to each region
   for region in us-east-1 eu-west-1 ap-south-1 ap-southeast-1 me-south-1; do
     cd terraform/environments/production/$region
     terraform apply
   done
   ```

2. **Day 3-4**: GeoDNS configuration
   ```bash
   # Configure Route53 latency-based routing
   # Test from different geos
   ```

3. **Day 5**: Monitoring and alerting
   ```bash
   # Deploy monitoring stack to all regions
   # Configure cross-region dashboards
   # Setup PagerDuty integration
   ```

**Deliverables**:
- ✅ All 5 regions deployed
- ✅ GeoDNS routing working
- ✅ Monitoring and alerting active

#### Week 8: Canary Rollout and Optimization
**Goal**: Gradual traffic migration and optimization

**Tasks**:
1. **Day 1**: Canary deployment (5% traffic)
   - Monitor for 24 hours
   - Check error rates, latency, packet loss

2. **Day 2-3**: Increase to 25% traffic
   - Monitor for 24 hours
   - Optimize based on real traffic

3. **Day 4**: Increase to 100% traffic
   - Monitor closely
   - Be ready to rollback

4. **Day 5**: Post-deployment review
   - Document lessons learned
   - Update runbooks
   - Cost optimization

**Deliverables**:
- ✅ 100% traffic on new architecture
- ✅ Old P2P infrastructure decommissioned
- ✅ Documentation complete

## Critical Implementation Details

### 1. Client SDK Migration

**Current (SimplePeer)**:
```typescript
// Old P2P code
const peer = new SimplePeer({
  initiator: true,
  stream: localStream
});

peer.on('signal', signal => {
  socket.emit('signal', { to: userId, signal });
});

peer.on('stream', remoteStream => {
  videoElement.srcObject = remoteStream;
});
```

**New (LiveKit)**:
```typescript
// New SFU code
import { Room, RoomEvent, Track } from 'livekit-client';

const room = new Room({
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: {
    resolution: VideoPresets.h720.resolution,
  },
});

// Connect to room
const token = await getAccessToken(roomName, userName);
await room.connect(wsUrl, token);

// Publish local tracks
await room.localParticipant.setCameraEnabled(true);
await room.localParticipant.setMicrophoneEnabled(true);

// Subscribe to remote tracks
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  if (track.kind === Track.Kind.Video) {
    const videoElement = track.attach();
    container.appendChild(videoElement);
  }
});

// Handle simulcast layers
room.on(RoomEvent.TrackStreamStateChanged, (publication, streamState) => {
  // Adjust quality based on network conditions
});
```

### 2. Signaling Server Implementation

```go
// services/signaling/main.go
package main

import (
    "github.com/gorilla/websocket"
    "github.com/livekit/protocol/livekit"
    "github.com/livekit/protocol/auth"
)

type SignalingServer struct {
    upgrader websocket.Upgrader
    orchestrator *OrchestratorClient
    redis *redis.Client
}

func (s *SignalingServer) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, err := s.upgrader.Upgrade(w, r, nil)
    if err != nil {
        return
    }
    defer conn.Close()
    
    // Authenticate
    token := r.URL.Query().Get("token")
    claims, err := auth.ParseAPIToken(token)
    if err != nil {
        return
    }
    
    // Get room assignment from orchestrator
    roomInfo, err := s.orchestrator.AssignRoom(claims.Video.Room)
    if err != nil {
        return
    }
    
    // Generate LiveKit token
    at := auth.NewAccessToken(apiKey, apiSecret)
    grant := &auth.VideoGrant{
        RoomJoin: true,
        Room:     claims.Video.Room,
    }
    at.AddGrant(grant).SetIdentity(claims.Identity)
    
    token, err = at.ToJWT()
    if err != nil {
        return
    }
    
    // Send connection info to client
    response := map[string]interface{}{
        "url": roomInfo.SFUUrl,
        "token": token,
    }
    conn.WriteJSON(response)
}
```

### 3. Room Orchestrator Implementation

```go
// services/orchestrator/main.go
package main

import (
    "context"
    clientv3 "go.etcd.io/etcd/client/v3"
)

type Orchestrator struct {
    etcd *clientv3.Client
    sfuRegistry *SFURegistry
}

type SFUInfo struct {
    ID string
    Region string
    CurrentLoad int
    MaxCapacity int
    URL string
}

func (o *Orchestrator) AssignRoom(roomID string, participants int) (*SFUInfo, error) {
    // 1. Get client region (from IP geolocation)
    clientRegion := o.getClientRegion()
    
    // 2. Get available SFUs in region
    sfus, err := o.sfuRegistry.GetSFUsInRegion(clientRegion)
    if err != nil {
        return nil, err
    }
    
    // 3. Filter by capacity
    availableSFUs := []SFUInfo{}
    for _, sfu := range sfus {
        if sfu.CurrentLoad + participants <= sfu.MaxCapacity {
            availableSFUs = append(availableSFUs, sfu)
        }
    }
    
    if len(availableSFUs) == 0 {
        return nil, errors.New("no available SFU")
    }
    
    // 4. Bin-packing: select SFU with highest current load
    sort.Slice(availableSFUs, func(i, j int) bool {
        return availableSFUs[i].CurrentLoad > availableSFUs[j].CurrentLoad
    })
    
    selectedSFU := availableSFUs[0]
    
    // 5. Reserve capacity in etcd
    key := fmt.Sprintf("/sfus/%s/load", selectedSFU.ID)
    _, err = o.etcd.Put(context.Background(), key, 
        fmt.Sprintf("%d", selectedSFU.CurrentLoad + participants))
    
    return &selectedSFU, nil
}
```

### 4. Autoscaling Configuration

```yaml
# Custom metrics for HPA
apiVersion: v1
kind: Service
metadata:
  name: livekit-metrics
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "6789"
spec:
  selector:
    app: livekit-sfu
  ports:
  - port: 6789
    name: metrics

---
# Prometheus adapter for custom metrics
apiVersion: v1
kind: ConfigMap
metadata:
  name: adapter-config
data:
  config.yaml: |
    rules:
    - seriesQuery: 'livekit_room_total'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^livekit_room_total"
        as: "livekit_active_streams"
      metricsQuery: 'sum(livekit_track_published_total{<<.LabelMatchers>>}) by (<<.GroupBy>>)'

---
# HPA with custom metrics
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: livekit-sfu
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: livekit-sfu
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
  - type: Pods
    pods:
      metric:
        name: livekit_active_streams
      target:
        type: AverageValue
        averageValue: "400"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 30
      selectPolicy: Max
```

## Cost Optimization Strategies

### 1. Reduce TURN Usage (Target: <10%)
- Optimize ICE gathering
- Use STUN first, TURN as fallback
- Implement UDP hole-punching
- **Savings**: ~$10K/month

### 2. Spot Instances for Non-Critical Workloads
- Use spot instances for recording workers
- Use spot instances for dev/staging
- **Savings**: ~$2K/month

### 3. Reserved Instances for SFU
- 1-year reserved instances for baseline capacity
- **Savings**: ~$3K/month

### 4. Bandwidth Optimization
- Enable simulcast (reduce unnecessary high-quality streams)
- Implement active speaker detection
- Use SVC where supported
- **Savings**: ~$5K/month

**Total Potential Savings**: ~$20K/month (38% reduction)
**Optimized Monthly Cost**: ~$33K/month

## Monitoring and Alerting

### Key Metrics to Track

```yaml
# Critical Alerts (PagerDuty)
- name: SFUPodCrashLoop
  expr: rate(kube_pod_container_status_restarts_total{pod=~"livekit-sfu.*"}[5m]) > 0
  severity: critical

- name: HighPacketLoss
  expr: livekit_packet_loss_ratio > 0.05
  severity: critical

- name: RoomJoinFailureRate
  expr: rate(livekit_room_join_failed_total[5m]) / rate(livekit_room_join_total[5m]) > 0.1
  severity: critical

# Warning Alerts (Slack)
- name: HighCPUUsage
  expr: avg(rate(container_cpu_usage_seconds_total{pod=~"livekit-sfu.*"}[5m])) > 0.8
  for: 5m
  severity: warning

- name: HighTURNFallbackRate
  expr: rate(coturn_allocations_total[5m]) / rate(ice_connection_total[5m]) > 0.2
  severity: warning
```

### Dashboards

1. **Executive Dashboard**: Global overview, SLA metrics
2. **SFU Dashboard**: Per-pod metrics, bandwidth, packet loss
3. **TURN Dashboard**: Allocation rate, bandwidth, fallback percentage
4. **Network Dashboard**: Cross-region latency, DNS query time
5. **Cost Dashboard**: Real-time cost tracking, per-user cost

## Security Checklist

- [ ] TLS 1.3 for all HTTPS/WSS connections
- [ ] SRTP for media encryption
- [ ] JWT authentication for API
- [ ] HMAC-authenticated TURN credentials
- [ ] Network policies (deny-all by default)
- [ ] Secrets in AWS Secrets Manager / Kubernetes Secrets
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] GDPR compliance (data retention, right to deletion)
- [ ] Audit logging for all API calls

## Disaster Recovery Plan

### Backup Strategy
- PostgreSQL: Automated daily backups, 30-day retention
- etcd: Hourly snapshots, 7-day retention
- S3 recordings: Cross-region replication

### Failover Procedures
1. **SFU pod failure**: Automatic restart, clients reconnect
2. **TURN pod failure**: Load balancer removes, clients failover
3. **Region failure**: GeoDNS routes to next nearest region
4. **Database failure**: Automatic failover to standby (Multi-AZ)

### RTO/RPO Targets
- RTO (Recovery Time Objective): < 5 minutes
- RPO (Recovery Point Objective): < 5 minutes

## Required SRE Skills

### Must Have
1. **Kubernetes**: Deep understanding of pods, services, deployments, HPA
2. **Networking**: UDP/TCP, NAT traversal, load balancing, DNS
3. **WebRTC**: ICE, STUN, TURN, SRTP, simulcast
4. **Cloud Platforms**: AWS or GCP (VPC, EKS/GKE, RDS, S3)
5. **Terraform**: Infrastructure as Code
6. **Monitoring**: Prometheus, Grafana, alerting

### Nice to Have
1. **Go**: For custom services (signaling, orchestrator)
2. **FFmpeg**: For recording pipeline
3. **etcd**: Distributed coordination
4. **Redis**: Caching and pub/sub
5. **Load Testing**: k6, custom WebRTC load tools

## Next Steps

1. **Review this guide** with your team
2. **Assign roles** (who owns what)
3. **Set up project tracking** (Jira, Linear, etc.)
4. **Start Phase 1** (Infrastructure Setup)
5. **Weekly sync meetings** to track progress
6. **Document everything** as you go

## Support

For questions or issues during implementation:
1. Check the runbooks in `docs/runbooks/`
2. Review the architecture docs
3. Consult LiveKit documentation: https://docs.livekit.io
4. Join LiveKit Slack community

## Conclusion

This is a significant undertaking, but the architecture is proven at scale. Companies like Daily.co, Whereby, and others use similar architectures to serve millions of users.

The key to success is:
1. **Incremental rollout**: Don't try to do everything at once
2. **Thorough testing**: Load test early and often
3. **Monitoring**: You can't fix what you can't measure
4. **Documentation**: Future you will thank present you

Good luck! 🚀
