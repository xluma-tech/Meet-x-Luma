# Install Redis Dependencies

## Required Packages

To use Redis for join requests, you need to install the following packages:

### 1. ioredis
Redis client for Node.js with full TypeScript support

### 2. uuid
For generating unique request IDs

## Installation Command

Run this command in the `backend` directory:

```bash
npm install ioredis uuid
```

Or if you prefer yarn:

```bash
yarn add ioredis uuid
```

## Verification

After installation, your `package.json` should include:

```json
{
  "dependencies": {
    "ioredis": "^5.3.2",
    "uuid": "^9.0.1",
    ...
  }
}
```

## Next Steps

1. Install the packages
2. Restart the backend server
3. Test join request functionality
4. Monitor Redis connection in console logs

## Expected Console Output

After starting the server, you should see:

```
✅ MongoDB connected successfully
✅ Redis connected successfully
✅ Redis is ready
✓ Backend server running on http://0.0.0.0:4000
```

## Troubleshooting

### If Redis connection fails:

1. Check `.env` file has correct Redis credentials
2. Verify Upstash Redis instance is active
3. Check network connectivity
4. Try pinging the Redis host

### If packages fail to install:

1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install` again
4. Check Node.js version (should be 16+)
