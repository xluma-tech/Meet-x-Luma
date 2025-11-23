// k6 Load Test for WebRTC Media Platform
// Usage: k6 run --vus 100 --duration 30m webrtc-load-test.js

import { check, sleep } from 'k6';
import ws from 'k6/ws';
import { Counter, Trend, Rate } from 'k6/metrics';

// Custom metrics
const connectionTime = new Trend('connection_time');
const roomJoinTime = new Trend('room_join_time');
const messageLatency = new Trend('message_latency');
const connectionErrors = new Counter('connection_errors');
const connectionSuccess = new Rate('connection_success');

// Configuration
const SIGNALING_URL = __ENV.SIGNALING_URL || 'wss://signaling.example.com';
const ROOM_PREFIX = __ENV.ROOM_PREFIX || 'load-test';
const USERS_PER_ROOM = parseInt(__ENV.USERS_PER_ROOM || '10');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 500 },   // Ramp up to 500 users
    { duration: '10m', target: 1000 }, // Ramp up to 1000 users
    { duration: '10m', target: 1000 }, // Stay at 1000 users
    { duration: '3m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    'connection_time': ['p(95)<5000'],        // 95% of connections under 5s
    'room_join_time': ['p(99)<5000'],         // 99% of room joins under 5s
    'message_latency': ['p(95)<500'],         // 95% of messages under 500ms
    'connection_success': ['rate>0.95'],      // 95% success rate
    'connection_errors': ['count<100'],       // Less than 100 errors total
  },
};

// Generate user ID
function generateUserId() {
  return `user-${__VU}-${__ITER}`;
}

// Generate room ID (distribute users across rooms)
function generateRoomId() {
  const roomNumber = Math.floor(__VU / USERS_PER_ROOM);
  return `${ROOM_PREFIX}-${roomNumber}`;
}

// Simulate WebRTC connection
export default function () {
  const userId = generateUserId();
  const roomId = generateRoomId();
  const url = `${SIGNALING_URL}?userId=${userId}&roomId=${roomId}`;
  
  const startTime = Date.now();
  
  const res = ws.connect(url, {}, function (socket) {
    const connectionDuration = Date.now() - startTime;
    connectionTime.add(connectionDuration);
    
    socket.on('open', () => {
      console.log(`${userId} connected to ${roomId}`);
      connectionSuccess.add(1);
      
      // Join room
      const joinStartTime = Date.now();
      socket.send(JSON.stringify({
        type: 'join-room',
        roomId: roomId,
        userName: userId,
      }));
      
      socket.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'room-joined') {
          const joinDuration = Date.now() - joinStartTime;
          roomJoinTime.add(joinDuration);
          console.log(`${userId} joined ${roomId} in ${joinDuration}ms`);
        }
        
        if (message.type === 'user-joined') {
          console.log(`${userId} sees new user: ${message.userId}`);
        }
        
        if (message.type === 'signal') {
          // Simulate WebRTC signaling
          const latency = Date.now() - message.timestamp;
          messageLatency.add(latency);
          
          // Send answer
          socket.send(JSON.stringify({
            type: 'signal',
            to: message.from,
            signal: { type: 'answer', sdp: 'mock-sdp' },
            timestamp: Date.now(),
          }));
        }
      });
      
      // Simulate staying in room
      socket.setTimeout(() => {
        // Send periodic heartbeat
        socket.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now(),
        }));
      }, 10000);
      
      // Stay in room for random duration (30-120 seconds)
      const duration = 30000 + Math.random() * 90000;
      socket.setTimeout(() => {
        console.log(`${userId} leaving ${roomId}`);
        socket.close();
      }, duration);
    });
    
    socket.on('error', (e) => {
      console.error(`${userId} error:`, e);
      connectionErrors.add(1);
      connectionSuccess.add(0);
    });
    
    socket.on('close', () => {
      console.log(`${userId} disconnected from ${roomId}`);
    });
  });
  
  check(res, {
    'status is 101': (r) => r && r.status === 101,
  });
  
  // Wait before next iteration
  sleep(1);
}

// Setup function (runs once per VU)
export function setup() {
  console.log('Starting load test...');
  console.log(`Signaling URL: ${SIGNALING_URL}`);
  console.log(`Users per room: ${USERS_PER_ROOM}`);
  return { startTime: Date.now() };
}

// Teardown function (runs once at the end)
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration}s`);
}
