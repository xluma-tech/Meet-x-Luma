# Detailed Architecture Design

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  (Web/Mobile Apps with WebRTC, Simulcast, ICE/STUN/TURN)       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ GeoDNS / Anycast
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Edge Layer (Per POP)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Edge Load Balancer (NLB/GLB)                            │  │
│  │  - UDP (RTP): 10000-60000                                │  │
│  │  - TCP: 443, 7881                                        │  │
│  │  - TLS: 443 (HTTPS/WSS/TURN-TLS)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐   ┌──────────────┐
│ Media Plane  │   │ Control Plane│
└──────────────┘   └──────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Media Plane (Per POP)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SFU Cluster (LiveKit)                                   │  │
│  │  - Simulcast/SVC support                                 │  │
│  │  - Active speaker detection                              │  │
│  │  - Selective forwarding                                  │  │
│  │  - Auto-scaling (HPA + custom metrics)                   │  │
│  │  - 50-100 participants per instance                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TURN Cluster (coturn)                                   │  │
│  │  - UDP relay (primary)                                   │  │
│  │  - TURN-over-TLS:443 (fallback)                         │  │
│  │  - HMAC-authenticated short-lived credentials           │  │
│  │  - Auto-scaling based on active allocations             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Control Plane (Per POP)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Signaling Service (WebSocket/gRPC)                      │  │
│  │  - Stateless, horizontally scalable                      │  │
│  │  - WebRTC signaling (offer/answer/ICE)                   │  │
│  │  - Redis pub/sub for cross-instance messaging           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Room Orchestrator                                       │  │
│  │  - Room placement (geo + load-based)                     │  │
│  │  - SFU binding and routing                              │  │
│  │  - Room sharding for large meetings (>150 participants) │  │
│  │  - etcd for distributed state                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Data Plane (Global)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Recording Workers                                        │  │
│  │  - FFmpeg-based transcoding                              │  │
│  │  - Separate autoscaling group                            │  │
│  │  - S3 storage for recordings                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  State Storage                                            │  │
│  │  - PostgreSQL (room metadata, users)                     │  │
│  │  - Redis (ephemeral session state)                       │  │
│  │  - etcd (orchestrator coordination)                      │  │
│  │  - S3 (recordings, artifacts)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 Observability Layer (Global)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Prometheus + Thanos (metrics aggregation)               │  │
│  │  Grafana (dashboards)                                     │  │
│  │  Alertmanager (alerting)                                  │  │
│  │  ELK Stack (logs)                                         │  │
│  │  Jaeger (distributed tracing)                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Regional Distribution

### POP Locations

| Region | Provider Region | Purpose | Expected Load |
|--------|----------------|---------|---------------|
| us-east1 | AWS us-east-1 / GCP us-east1 | North America | 40% |
| europe-west1 | AWS eu-west-1 / GCP europe-west1 | Europe | 30% |
| asia-south1 | AWS ap-south-1 / GCP asia-south1 | India | 15% |
| asia-southeast1 | AWS ap-southeast-1 / GCP asia-southeast1 | Singapore/SEA | 10% |
| me-south1 | AWS me-south-1 / GCP me-west1 | Middle East | 5% |

### GeoDNS Routing

```
Client Request → Route53/Cloud DNS
  ↓
Latency-based routing policy
  ↓
Nearest healthy POP
  ↓
Edge Load Balancer
```

## Component Deep Dive

### 1. SFU Cluster (LiveKit)

#### Architecture
- **Deployment**: Kubernetes StatefulSet (for stable network identity)
- **Scaling**: Horizontal Pod Autoscaler (HPA) with custom metrics
- **Networking**: Host network mode for optimal UDP performance
- **Storage**: Ephemeral (no persistent state)

#### Configuration
```yaml
Resources per SFU pod:
  CPU: 8 cores (request: 6, limit: 8)
  Memory: 32Gi (request: 24Gi, limit: 32Gi)
  Network: 10Gbps NIC

Capacity per pod:
  Participants: 50-100 (depends on simulcast layers)
  Ingress: ~100 Mbps (100 users × 1 Mbps)
  Egress: ~300 Mbps (100 users × 3 streams × 1 Mbps)
  Packets/sec: ~100K
```

#### Simulcast Configuration
```
Video layers:
  - High: 1280×720 @ 30fps, 2.5 Mbps
  - Medium: 640×360 @ 30fps, 800 Kbps
  - Low: 320×180 @ 15fps, 300 Kbps

Audio:
  - Opus codec, 32 Kbps, stereo
```

#### Selective Forwarding Logic
1. **Active Speaker Detection**: Audio level analysis (RTCP)
2. **Priority Forwarding**:
   - Active speaker: High quality to all
   - Others: Medium/Low based on viewport
3. **Bandwidth Adaptation**: TWCC feedback for congestion control

#### Auto-scaling Metrics
```
Scale up when:
  - CPU > 75% for 2 minutes
  - OR Active streams > 400
  - OR Ingress bandwidth > 7 Gbps
  - OR Packet loss > 2%

Scale down when:
  - CPU < 40% for 10 minutes
  - AND Active streams < 200
  - AND No rooms in "critical" state
```

### 2. TURN Cluster (coturn)

#### Architecture
- **Deployment**: Kubernetes DaemonSet (one per node for port allocation)
- **Scaling**: Node-based (add nodes to scale)
- **Networking**: Host network mode (UDP port range)

#### Configuration
```yaml
Resources per TURN pod:
  CPU: 4 cores
  Memory: 8Gi
  Network: 10Gbps NIC

Port allocation:
  UDP: 49152-65535 (16,384 ports)
  TCP: 443 (TLS fallback)

Capacity per pod:
  Concurrent allocations: ~2000
  Bandwidth: ~5 Gbps
```

#### Credential Management
```
TURN credentials:
  - Short-lived (TTL: 24 hours)
  - HMAC-SHA256 authenticated
  - Format: timestamp:username:hmac
  - Rotation: Every 12 hours
  - Secret stored in Kubernetes Secret
```

#### Auto-scaling
```
Scale up when:
  - Active allocations > 1500 per pod
  - OR Bandwidth > 4 Gbps per pod
  - OR CPU > 70%

Scale down when:
  - Active allocations < 500 per pod
  - AND Bandwidth < 2 Gbps
```

### 3. Signaling Service

#### Architecture
- **Deployment**: Kubernetes Deployment (stateless)
- **Protocol**: WebSocket (primary), gRPC (internal)
- **State**: Redis for session tracking
- **Scaling**: Standard HPA (CPU/memory)

#### Message Flow
```
1. Client connects via WSS
2. Authenticate (JWT)
3. Join room request
4. Orchestrator assigns SFU
5. Exchange WebRTC signaling (offer/answer/ICE)
6. Establish peer connection to SFU
7. Media flows directly to SFU
```

#### Configuration
```yaml
Resources per pod:
  CPU: 2 cores
  Memory: 4Gi

Capacity per pod:
  WebSocket connections: ~5000
  Messages/sec: ~10K
```

### 4. Room Orchestrator

#### Architecture
- **Deployment**: Kubernetes StatefulSet (3 replicas)
- **State**: etcd cluster (distributed consensus)
- **API**: gRPC (internal), REST (external)

#### Room Placement Algorithm
```go
func PlaceRoom(roomID string, participants int) (sfuID string, err error) {
    // 1. Get client geo location
    clientRegion := getClientRegion()
    
    // 2. Filter SFUs in same region
    sfus := getSFUsInRegion(clientRegion)
    
    // 3. Filter by capacity
    sfus = filterByCapacity(sfus, participants)
    
    // 4. Sort by current load (bin-packing)
    sort.Slice(sfus, func(i, j int) bool {
        return sfus[i].CurrentLoad > sfus[j].CurrentLoad
    })
    
    // 5. Select SFU with most available capacity
    selectedSFU := sfus[0]
    
    // 6. Reserve capacity
    err = reserveCapacity(selectedSFU, participants)
    
    return selectedSFU.ID, err
}
```

#### Room Sharding (Large Rooms)
```
For rooms > 150 participants:
  1. Create multiple shards (50-100 participants each)
  2. Assign each shard to different SFU
  3. Interconnect SFUs for active speakers only
  4. Forward only necessary layers between shards
  
Example: 300 participants
  - Shard 1: 100 participants on SFU-A
  - Shard 2: 100 participants on SFU-B
  - Shard 3: 100 participants on SFU-C
  - Inter-SFU: Forward 3 active speakers between shards
```

### 5. Recording Workers

#### Architecture
- **Deployment**: Kubernetes Job (on-demand)
- **Scaling**: Job-based autoscaling
- **Storage**: S3-compatible

#### Recording Pipeline
```
1. Room recording request
2. Spawn FFmpeg worker
3. Subscribe to SFU streams
4. Composite video (grid layout)
5. Encode to MP4 (H.264 + AAC)
6. Upload to S3
7. Generate thumbnails
8. Update metadata in PostgreSQL
9. Cleanup and terminate
```

#### Configuration
```yaml
Resources per worker:
  CPU: 4 cores (video encoding)
  Memory: 8Gi
  GPU: Optional (NVENC for hardware encoding)

Output format:
  Video: H.264, 1920×1080, 30fps, 4 Mbps
  Audio: AAC, 128 Kbps, stereo
  Container: MP4
```

## Network Architecture

### VPC Design (Per Region)

```
VPC CIDR: 10.X.0.0/16 (X = region index)

Subnets:
  - Public (Edge LB, NAT):     10.X.0.0/20
  - Private (SFU, TURN):       10.X.16.0/20
  - Private (Control Plane):   10.X.32.0/20
  - Private (Data):            10.X.48.0/20
  - Private (Monitoring):      10.X.64.0/20

Availability Zones: 3 per region
  - AZ-A: 10.X.0.0/18
  - AZ-B: 10.X.64.0/18
  - AZ-C: 10.X.128.0/18
```

### Load Balancer Configuration

```yaml
Edge Load Balancer (Network Load Balancer):
  Type: Layer 4 (TCP/UDP)
  
  Listeners:
    - UDP 10000-60000 → SFU cluster (RTP)
    - TCP 443 → Signaling service (WSS)
    - TCP 443 → TURN cluster (TURN-TLS)
    - TCP 7881 → SFU cluster (WebRTC-TCP fallback)
  
  Health checks:
    - Protocol: HTTP
    - Path: /health
    - Interval: 10s
    - Timeout: 5s
    - Healthy threshold: 2
    - Unhealthy threshold: 3
  
  Cross-zone load balancing: Enabled
  Connection draining: 300s
```

### Firewall Rules

```yaml
Ingress:
  - Source: 0.0.0.0/0, Protocol: UDP, Ports: 10000-60000 (RTP)
  - Source: 0.0.0.0/0, Protocol: TCP, Port: 443 (HTTPS/WSS/TURN-TLS)
  - Source: 0.0.0.0/0, Protocol: TCP, Port: 7881 (WebRTC-TCP)
  - Source: VPC CIDR, Protocol: ALL (internal)

Egress:
  - Destination: 0.0.0.0/0, Protocol: ALL (allow all outbound)
```

## Security Architecture

### TLS/SRTP
```
1. TLS 1.3 for all HTTPS/WSS connections
2. SRTP for media encryption (DTLS-SRTP)
3. Certificate management: cert-manager + Let's Encrypt
4. Automatic rotation: 60 days before expiry
```

### Authentication & Authorization
```
1. Client authentication: JWT tokens
2. TURN authentication: HMAC-based short-lived credentials
3. API authentication: API keys + mTLS for internal services
4. RBAC: Kubernetes RBAC + custom policies
```

### Network Security
```
1. Network policies: Deny all by default, allow specific
2. Private subnets: No direct internet access
3. NAT Gateway: For outbound traffic from private subnets
4. VPC peering: For cross-region communication
5. Security groups: Least privilege principle
```

### Data Security
```
1. Encryption at rest: S3 SSE-KMS, RDS encryption
2. Encryption in transit: TLS everywhere
3. Secrets management: Kubernetes Secrets + AWS Secrets Manager
4. Audit logging: CloudTrail, Kubernetes audit logs
5. Compliance: GDPR, HIPAA-ready architecture
```

## Observability

### Metrics Collection

```yaml
SFU Metrics (Prometheus):
  - livekit_room_count
  - livekit_participant_count
  - livekit_track_count
  - livekit_packet_loss_ratio
  - livekit_jitter_ms
  - livekit_rtt_ms
  - livekit_bandwidth_ingress_bps
  - livekit_bandwidth_egress_bps
  - livekit_cpu_usage_percent
  - livekit_memory_usage_bytes

TURN Metrics:
  - coturn_allocations_total
  - coturn_bandwidth_ingress_bps
  - coturn_bandwidth_egress_bps
  - coturn_sessions_active

Application Metrics:
  - signaling_connections_active
  - signaling_messages_per_sec
  - room_join_duration_seconds
  - room_placement_duration_seconds
```

### Dashboards

```
1. Executive Dashboard
   - Global concurrent users
   - Active rooms
   - Regional distribution
   - Cost per user
   - Availability SLA

2. SFU Dashboard
   - CPU/Memory per pod
   - Bandwidth per pod
   - Packet loss, jitter, RTT
   - Active streams
   - Scaling events

3. TURN Dashboard
   - Active allocations
   - Bandwidth usage
   - Fallback rate
   - Geographic distribution

4. Network Dashboard
   - Load balancer metrics
   - Cross-region latency
   - Packet loss by region
   - DNS query latency

5. Cost Dashboard
   - Compute costs
   - Network egress costs
   - Storage costs
   - Cost per active user
```

### Alerting Rules

```yaml
Critical Alerts (PagerDuty):
  - SFU pod crash loop
  - Packet loss > 5%
  - Room join failure rate > 10%
  - TURN fallback rate > 30%
  - API error rate > 5%

Warning Alerts (Slack):
  - CPU > 80% for 5 minutes
  - Memory > 85% for 5 minutes
  - Packet loss > 3%
  - TURN fallback rate > 20%
  - Disk usage > 80%

Info Alerts (Email):
  - Scaling events
  - Certificate expiry (30 days)
  - Cost anomalies
```

## Disaster Recovery

### Backup Strategy
```
1. PostgreSQL: Automated daily backups, 30-day retention
2. etcd: Automated hourly snapshots, 7-day retention
3. Redis: AOF persistence, daily snapshots
4. S3 recordings: Cross-region replication
5. Configuration: Git-based, versioned
```

### Failover Procedures
```
1. SFU pod failure:
   - Kubernetes auto-restarts
   - Clients reconnect automatically
   - Room state preserved in orchestrator

2. TURN pod failure:
   - Load balancer removes from pool
   - Clients failover to other TURN servers
   - Minimal disruption (< 5s)

3. Region failure:
   - GeoDNS routes to next nearest region
   - Cross-region latency increases
   - Orchestrator rebalances rooms

4. Database failure:
   - Automatic failover to standby (RDS Multi-AZ)
   - RPO: < 5 minutes
   - RTO: < 2 minutes
```

### Chaos Testing
```
1. Pod termination: Random pod kills
2. Network partition: Simulate region isolation
3. Latency injection: Add artificial latency
4. Packet loss: Simulate network degradation
5. Resource exhaustion: CPU/memory pressure
```

## Performance Optimization

### Kernel Tuning (SFU Nodes)

```bash
# /etc/sysctl.d/99-sfu-tuning.conf

# Increase UDP buffer sizes
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.core.rmem_default = 16777216
net.core.wmem_default = 16777216
net.ipv4.udp_rmem_min = 16384
net.ipv4.udp_wmem_min = 16384

# Increase connection tracking
net.netfilter.nf_conntrack_max = 1048576
net.nf_conntrack_max = 1048576

# Increase file descriptors
fs.file-max = 2097152

# Disable IPv6 (if not used)
net.ipv6.conf.all.disable_ipv6 = 1

# TCP tuning
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 50000

# Increase ephemeral port range
net.ipv4.ip_local_port_range = 10000 65535
```

### NIC Tuning

```bash
# Increase ring buffer sizes
ethtool -G eth0 rx 4096 tx 4096

# Enable hardware offloading
ethtool -K eth0 gro on
ethtool -K eth0 tso on
ethtool -K eth0 gso on

# Set IRQ affinity (distribute across CPUs)
./set-irq-affinity.sh eth0
```

### Application Tuning

```yaml
LiveKit Configuration:
  rtc:
    port_range_start: 10000
    port_range_end: 60000
    use_external_ip: true
    tcp_port: 7881
  
  room:
    max_participants: 100
    empty_timeout: 300s
    departure_timeout: 20s
  
  video:
    simulcast:
      enabled: true
      layers: [low, medium, high]
    dynacast: true
  
  audio:
    active_speaker_update_interval: 300ms
```

## Migration Plan (P2P to SFU)

### Phase 1: Infrastructure Setup (Week 1-2)
1. Deploy dev environment (single region)
2. Deploy staging environment (2 regions)
3. Run load tests
4. Tune performance

### Phase 2: Client Migration (Week 3-4)
1. Update client SDK (SimplePeer → LiveKit SDK)
2. Implement feature parity
3. A/B testing (10% traffic)
4. Monitor metrics

### Phase 3: Production Rollout (Week 5-6)
1. Deploy production (all 5 regions)
2. Canary deployment (5% → 25% → 100%)
3. Monitor and optimize
4. Decommission old P2P infrastructure

### Phase 4: Optimization (Week 7-8)
1. Cost optimization
2. Performance tuning
3. Documentation
4. Training

## Appendix

### Glossary
- **SFU**: Selective Forwarding Unit
- **TURN**: Traversal Using Relays around NAT
- **STUN**: Session Traversal Utilities for NAT
- **ICE**: Interactive Connectivity Establishment
- **SRTP**: Secure Real-time Transport Protocol
- **DTLS**: Datagram Transport Layer Security
- **Simulcast**: Sending multiple quality layers simultaneously
- **SVC**: Scalable Video Coding

### References
- LiveKit Documentation: https://docs.livekit.io
- WebRTC Specification: https://www.w3.org/TR/webrtc/
- coturn Documentation: https://github.com/coturn/coturn
- Kubernetes Best Practices: https://kubernetes.io/docs/concepts/
