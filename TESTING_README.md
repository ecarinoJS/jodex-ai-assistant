# Jodex AI Assistant - Testing Guide

## Overview

This guide provides comprehensive testing instructions for the Jodex AI Assistant, including unit tests, integration tests, security tests, and end-to-end testing scenarios.

## Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Git

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd jodex-ai-assistant

# Install dependencies
npm install

# Install development dependencies
npm install --include=dev
```

### Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Test Structure

```
src/
├── __tests__/
│   ├── setup.ts              # Test configuration and mocks
│   ├── livekit.test.ts       # LiveKit integration tests
│   ├── openai.test.ts        # OpenAI client tests
│   ├── security.test.ts      # Security feature tests
│   └── integration/
│       └── security.test.ts  # Security integration tests
examples/
├── nextjs-app/
│   └── src/app/test/         # Test page for manual testing
mock-server/
│   ├── server.js             # Mock LiveKit server
│   └── package.json          # Mock server dependencies
```

## Testing Components

### 1. Unit Tests

#### LiveKit Tests (`livekit.test.ts`)
- VoiceConnection initialization
- Token generation and validation
- Voice recording functionality
- Text-to-speech features
- State management
- Error handling

#### OpenAI Tests (`openai.test.ts`)
- Client initialization and configuration
- Chat completion (streaming and non-streaming)
- Action extraction from responses
- Error handling and retry logic
- System prompt building
- Configuration updates

#### Security Tests (`security.test.ts`)
- Token generation security
- Rate limiting enforcement
- Input validation and sanitization
- CORS policy validation
- JWT token structure validation

### 2. Integration Tests

#### Security Integration (`integration/security.test.ts`)
- End-to-end authentication flows
- WebSocket security testing
- Content Security Policy validation
- Memory and resource limits
- Error information disclosure

### 3. Manual Testing

#### Test Page (`/test`)
- Interactive testing interface
- Security monitoring panel
- Connection status indicators
- Real-time event logging
- Test controls for security scenarios

## Running Specific Tests

### Unit Tests Only
```bash
# Run LiveKit tests
npm test -- src/__tests__/livekit.test.ts

# Run OpenAI tests
npm test -- src/__tests__/openai.test.ts

# Run security tests
npm test -- src/__tests__/security.test.ts
```

### Integration Tests Only
```bash
# Run all integration tests
npm test -- src/__tests__/integration/

# Run security integration tests
npm test -- src/__tests__/integration/security.test.ts
```

### Test by Pattern
```bash
# Run all security-related tests
npm test -- --grep "Security"

# Run all authentication tests
npm test -- --grep "Authentication"

# Run all token-related tests
npm test -- --grep "token"
```

## Mock Server Setup

### Start Mock LiveKit Server
```bash
cd mock-server
npm install
npm run dev
```

The mock server provides:
- JWT token generation endpoint
- WebSocket protocol implementation
- Rate limiting and security features
- Room and participant management

### Mock Server Endpoints
- `POST /api/livekit/token` - Generate authentication tokens
- `GET /health` - Health check endpoint
- `GET /api/rooms/:roomName` - Room information
- `WS /rtc` - WebSocket endpoint for LiveKit protocol

## Test Environment Configuration

### Environment Variables
```bash
# Create .env.test file
NEXT_PUBLIC_OPENAI_API_KEY=test_api_key
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=test_api_key
LIVEKIT_API_SECRET=test_api_secret
ALLOWED_ORIGINS=http://localhost:3000
```

### Test Configuration
The test environment is configured in:
- `vitest.config.ts` - Vitest configuration
- `src/__tests__/setup.ts` - Test setup and mocks

## Test Coverage

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html

# Generate coverage as lcov
npm run test:coverage -- --reporter=lcov
```

### Coverage Targets
- **Overall**: 90%+
- **Functions**: 95%+
- **Branches**: 85%+
- **Lines**: 90%+

## Manual Testing Guide

### 1. Basic Functionality Testing

#### Voice Features
1. Navigate to `http://localhost:3000/test`
2. Click the microphone button to start recording
3. Speak into the microphone
4. Verify transcription appears
5. Verify AI responds to voice input

#### Chat Features
1. Type a message in the chat input
2. Click send or press Enter
3. Verify AI response appears
4. Test streaming response (partial updates)
5. Test message history persistence

### 2. Security Testing

#### Token Generation
1. Open browser developer tools
2. Navigate to Network tab
3. Click "Test Token Generation" button
4. Verify token request structure
5. Verify response contains valid JWT

#### Rate Limiting
1. Click "Test Rate Limiting" button
2. Monitor network requests
3. Verify 429 responses after limit exceeded
4. Verify retry-after headers present

#### Connection Security
1. Check WebSocket URL uses WSS protocol
2. Verify CORS headers in responses
3. Test with invalid origin (should fail)

### 3. Error Handling Testing

#### Network Failures
1. Disconnect from internet
2. Try to send a message
3. Verify error appears gracefully
4. Reconnect and verify recovery

#### Authentication Failures
1. Use invalid API key
2. Verify error message appears
3. Verify no sensitive data exposed

#### Server Errors
1. Stop mock server
2. Try to generate token
3. Verify error handling works

## Test Data and Fixtures

### Test Utilities
```typescript
// Available in src/__tests__/setup.ts
import {
  createMockRoom,
  createMockParticipant,
  createMockMessage,
  createMockAction,
  createMockAlert,
  waitFor,
  flushPromises,
  createMockFetchResponse,
  createMockError,
} from '../setup';
```

### Mock Data Examples
```typescript
// Create mock message
const message = createMockMessage({
  content: 'Test message',
  role: 'user'
});

// Create mock action
const action = createMockAction({
  type: 'show_weather_alerts',
  priority: 'high'
});
```

## Performance Testing

### Load Testing Script
```bash
# Install load testing dependencies
npm install -D artillery

# Run load tests
artillery run load-test.yml
```

### Memory Testing
```bash
# Run tests with memory profiling
node --inspect-brk node_modules/.bin/vitest run

# Monitor memory usage
node --max-old-space-size=4096 node_modules/.bin/vitest run
```

## Continuous Integration

### GitHub Actions
Tests run automatically on:
- Pull requests
- Push to main branch
- Scheduled runs

### Test Results
- Coverage reports uploaded to Codecov
- Test results available in GitHub Actions
- Security scan results in GitHub Security tab

## Troubleshooting

### Common Issues

**Tests Fail Due to Mock Server**
```bash
# Check if mock server is running
curl http://localhost:7880/health

# Restart mock server
cd mock-server && npm run dev
```

**WebSocket Connection Issues**
```bash
# Check WebSocket server
wscat -c ws://localhost:7880/rtc

# Verify server logs
cd mock-server && npm run dev
```

**Test Timeouts**
```bash
# Increase timeout
vitest --test-timeout=10000

# Run single test file
npm test -- src/__tests__/livekit.test.ts
```

**Memory Issues in Tests**
```bash
# Run with increased memory
node --max-old-space-size=4096 node_modules/.bin/vitest

# Run tests sequentially
npm test -- --run
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=jodex:* npm test

# Run tests with Node.js debugging
node --inspect-brk node_modules/.bin/vitest

# Run tests with verbose output
npm test -- --reporter=verbose
```

## Best Practices

### Writing Tests
1. **Arrange-Act-Assert**: Structure tests clearly
2. **Descriptive Names**: Use descriptive test names
3. **Mock External Dependencies**: Avoid network calls
4. **Test Edge Cases**: Don't just test happy paths
5. **Clean Up**: Clean up mocks and timers

### Test Organization
1. **Group Related Tests**: Use describe blocks
2. **Shared Setup**: Use beforeEach for common setup
3. **Test Utilities**: Create reusable test utilities
4. **Test Data**: Use fixtures for consistent test data
5. **Documentation**: Document complex test scenarios

### Security Testing
1. **Authentication**: Test all authentication flows
2. **Authorization**: Verify access controls
3. **Input Validation**: Test with malicious inputs
4. **Error Handling**: Verify no information disclosure
5. **Rate Limiting**: Test protection mechanisms

## Contributing Tests

When contributing new features:

1. **Add Unit Tests**: Cover new functionality with unit tests
2. **Add Integration Tests**: Test integration points
3. **Update Documentation**: Update test documentation
4. **Verify Coverage**: Ensure coverage targets are met
5. **Manual Testing**: Verify functionality manually

### Test Checklist
- [ ] Unit tests added and passing
- [ ] Integration tests added and passing
- [ ] Security tests updated if needed
- [ ] Documentation updated
- [ ] Manual testing performed
- [ ] Coverage targets maintained

---

This testing guide provides comprehensive coverage for the Jodex AI Assistant. Regular testing ensures reliability, security, and performance of the voice AI system.