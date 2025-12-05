// Test token generation
const { AccessToken } = require('livekit-server-sdk');

// Hardcoded from backend/.env
const LIVEKIT_API_KEY = 'devkey';
const LIVEKIT_API_SECRET = 'secret';
const LIVEKIT_URL = 'ws://localhost:7880';

console.log('🔑 Testing Token Generation');
console.log('===========================');
console.log('API Key:', LIVEKIT_API_KEY);
console.log('API Secret:', LIVEKIT_API_SECRET ? '***' + LIVEKIT_API_SECRET.slice(-4) : 'NOT SET');
console.log('URL:', LIVEKIT_URL);
console.log('');

try {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: 'test-user-123',
    name: 'Test User',
  });

  at.addGrant({
    roomJoin: true,
    room: 'test-room',
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = at.toJwt();
  
  console.log('✅ Token generated successfully!');
  console.log('');
  console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
  console.log('Token length:', token.length);
  console.log('');
  console.log('🧪 Now test this token with LiveKit:');
  console.log('');
  console.log('curl -X GET "http://localhost:7880/rtc/validate" \\');
  console.log('  -H "Authorization: Bearer ' + token + '"');
  console.log('');
  
  // Decode token to show contents
  const parts = token.split('.');
  if (parts.length === 3) {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('📋 Token Payload:');
    console.log(JSON.stringify(payload, null, 2));
  }
  
} catch (error) {
  console.error('❌ Error generating token:', error.message);
  process.exit(1);
}
