# Mock LiveKit Server for Jodex AI Testing

A mock LiveKit server designed for testing the Jodex AI Assistant's secure LiveKit integration.

## Features

- **JWT Token Generation**: Mock LiveKit-compatible JWT tokens
- **Rate Limiting**: Configurable rate limiting for security testing
- **WebSocket Protocol**: Mock LiveKit WebSocket protocol implementation
- **Security Headers**: Helmet.js security headers
- **CORS Protection**: Configurable CORS settings
- **Request Validation**: Input validation and size limits
- **Room Management**: In-memory room and participant tracking
- **Health Monitoring**: Health check and monitoring endpoints

## Setup

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
cd mock-server
npm install
```

### Environment Variables

```bash
# Server configuration
PORT=7880
JWT_SECRET=jodex-test-secret-key-change-in-production
LIVEKIT_API_KEY=test-api-key
LIVEKIT_API_SECRET=test-api-secret

# Security settings
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Running the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### POST /api/livekit/token
Generate mock LiveKit JWT tokens for authentication.

**Request:**
```json
{
  "roomName": "test-room",
  "participantName": "Test User",
  "participantIdentity": "test-user-123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "serverUrl": "ws://localhost:7880",
  "expiresIn": 3600
}
```

### GET /health
Health check endpoint with server statistics.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "rooms": 2,
  "participants": 5
}
```

### GET /api/rooms/:roomName
Get information about a specific room.

**Response:**
```json
{
  "name": "test-room",
  "participants": ["user-1", "user-2"],
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

## WebSocket Protocol

The mock server implements a simplified LiveKit WebSocket protocol:

### Connection
Connect to: `ws://localhost:7880/rtc`

### Message Types

#### join_room
```json
{
  "type": "join_room",
  "roomName": "test-room",
  "participant": {
    "identity": "user-123",
    "name": "Test User"
  }
}
```

#### publish_track
```json
{
  "type": "publish_track",
  "trackKind": "audio",
  "trackName": "microphone"
}
```

## Security Features

### Rate Limiting
- 10 requests per minute per IP for token generation
- Configurable windows and limits
- Automatic retry-after headers

### Input Validation
- Request body size limited to 1KB
- Required field validation
- Type checking for all inputs

### Security Headers
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Referrer Policy

### CORS Protection
- Configurable allowed origins
- Credentials support
- Pre-flight handling

## Testing Scenarios

### 1. Normal Operation
- Token generation and validation
- Room joining and leaving
- Track publishing and subscription

### 2. Security Testing
- Rate limiting enforcement
- Input validation
- CORS policy testing
- Authentication failures

### 3. Error Handling
- Invalid token format
- Room not found
- Permission denied
- Network failures

## Integration with Jodex AI

### Configure Jodex AI
```javascript
const jodexConfig = {
  livekitUrl: 'ws://localhost:7880',
  useServerToken: true, // Use server-side token generation
  // ... other config
};
```

### Environment Setup
```bash
# In your Jodex app environment
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=test-api-key
LIVEKIT_API_SECRET=test-api-secret
```

## Monitoring

### Security Events
The server logs all security-relevant events:
- Token generation requests
- Rate limit violations
- Connection attempts
- Authentication failures

### Performance Metrics
Monitor:
- Connection count
- Room count
- Token generation rate
- Error rates

## Development

### Adding New Features
1. Implement WebSocket message handlers in `server.js`
2. Add corresponding tests
3. Update documentation

### Testing
```bash
# Run tests (when implemented)
npm test
```

## Production Considerations

This mock server is designed for **testing only**. For production use:

1. Use real LiveKit server
2. Implement proper authentication
3. Add persistent storage
4. Set up monitoring and logging
5. Configure proper SSL certificates
6. Implement production-grade security

## Troubleshooting

### Common Issues

**CORS Errors**
- Check ALLOWED_ORIGINS environment variable
- Verify client-side URLs

**Connection Refused**
- Ensure server is running on correct port
- Check firewall settings

**Token Generation Fails**
- Verify JWT_SECRET is set
- Check API key/secret configuration

**WebSocket Connection Issues**
- Check WebSocket endpoint URL
- Verify firewall allows WebSocket connections

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=jodex:* npm start
```

## License

MIT License - see LICENSE file for details