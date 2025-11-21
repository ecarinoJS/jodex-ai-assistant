# Jodex AI Assistant Test Suite

This directory contains comprehensive test suites for the Jodex AI Assistant component library. The test suite is organized to ensure thorough coverage of all functionality while maintaining maintainability and reusability.

## Test Structure

```
src/__tests__/
├── components/          # Component-specific tests
├── lib/                # Library and utility tests
├── integration/        # Integration tests
├── security/           # Security-specific tests
├── utils/              # Test utilities and helpers
├── mocks/              # External dependency mocks
├── setup.ts            # Global test setup
└── README.md           # This file
```

## Test Categories

### 1. Component Tests (`components/`)
- **JodexAI.test.tsx**: Main component orchestration tests
- **ChatInterface.test.tsx**: Chat functionality tests
- **VoiceInterface.test.tsx**: Voice interaction tests
- **AlertPanel.test.tsx**: Alert system tests

### 2. Library Tests (`lib/`)
- **actions.test.ts**: Action system tests
- **storage.test.ts**: Data persistence tests
- **browser-compatibility.test.ts**: Cross-browser compatibility tests

### 3. Integration Tests (`integration/`)
- **chat-voice.test.tsx**: Chat and voice integration tests
- **storage.test.tsx**: Storage integration tests
- **error-handling.test.tsx**: Error handling integration tests

### 4. Security Tests (`security/`)
- **security.test.ts**: Core security tests
- **integration/security.test.ts**: Security integration tests

## Test Utilities

### Mock Data Generators

The test suite includes comprehensive mock data generators:

```typescript
import {
  createMockMessage,
  createMockAlert,
  createMockFarmer,
  createMockHarvest,
  createMockWeatherData,
  createMockDatasets,
  createMockAction,
} from '../utils';
```

### API Mocks

Extensive mocking for external dependencies:

```typescript
import {
  mockOpenAIConstructor,
  mockRoomConstructor,
  mockActionManagerConstructor,
  mockStorageManagerConstructor,
} from '../mocks/external';
```

### Custom Render Functions

Enhanced render utilities with built-in mocking:

```typescript
import { renderWithJodex } from '../utils';

// Render with full JodexAI setup
const { user, container } = await renderWithJodex(<Component />, {
  withJodexAI: true,
  jodexProps: { openaiApiKey: 'test-key' }
});
```

## Usage Examples

### Basic Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { createMockMessage, renderWithJodex } from '../utils';
import { ChatInterface } from '../../components/ChatInterface';

describe('ChatInterface', () => {
  it('should display messages', () => {
    const mockMessages = [
      createMockMessage({ content: 'Hello' }),
      createMockMessage({ content: 'World', role: 'assistant' })
    ];

    render(
      <ChatInterface
        messages={mockMessages}
        onSendMessage={vi.fn()}
        onMessageRead={vi.fn()}
      />
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
  });
});
```

### Testing with Voice Features

```typescript
import { renderWithJodex, mockMediaDevices } from '../utils';
import { JodexAI } from '../../JodexAI';

describe('Voice Features', () => {
  beforeEach(() => {
    mockMediaDevices({
      getUserMedia: vi.fn().mockResolvedValue(createMockMediaStream())
    });
  });

  it('should start voice recording', async () => {
    const { user, getByRole } = await renderWithJodex(<Component />, {
      withJodexAI: true,
      jodexProps: { voice: { enabled: true } }
    });

    const voiceButton = getByRole('button', { name: /start voice/i });
    await user.click(voiceButton);

    // Verify voice recording started
  });
});
```

### Integration Testing

```typescript
import { renderWithJodex, MockDataFactory } from '../utils';

describe('Storage Integration', () => {
  it('should persist messages across sessions', async () => {
    const messages = MockDataFactory.createConversation(5);

    const { user } = await renderWithJodex(<Component />, {
      withJodexAI: true,
      jodexProps: { storage: { enabled: true } }
    });

    // Send messages and verify persistence
  });
});
```

## Mock Configuration

### OpenAI Mocks

```typescript
import { mockOpenAIConstructor, createMockChatResponse } from '../mocks/external';

// Setup mock response
mockOpenAI.chat.completions.create.mockResolvedValue(
  createMockChatResponse('AI response here')
);
```

### LiveKit Mocks

```typescript
import { mockRoomConstructor } from '../mocks/external';

// Configure mock room behavior
mockRoomConstructor.mockReturnValue({
  connect: vi.fn().mockResolvedValue(true),
  localParticipant: {
    publishTrack: vi.fn()
  }
});
```

## Test Data Factories

### Conversation Factory

```typescript
import { MockDataFactory } from '../utils';

// Create realistic test conversations
const conversation = MockDataFactory.createConversation(10);
```

### Alert Factory

```typescript
// Create multiple alerts with different types and priorities
const alerts = MockDataFactory.createAlerts(5, ['weather', 'system', 'harvest']);
```

### Farmer Network Factory

```typescript
// Generate realistic farmer data
const farmers = MockDataFactory.createFarmerNetwork(20);
```

## Environment Setup

### Browser APIs Mocking

The test suite automatically mocks browser APIs:

- `localStorage` and `sessionStorage`
- `geolocation`
- `mediaDevices` (camera, microphone)
- `speechRecognition` and `speechSynthesis`
- `WebSocket`, `EventSource`
- `Canvas`, `WebGL`
- `Notification`, `Payment`, `Credentials`

### Performance Mocks

```typescript
import { createMockPerformanceNow } from '../utils';

// Mock performance.now() for timing tests
global.performance.now = createMockPerformanceNow(1000);
```

## Test Patterns

### Error Handling Tests

```typescript
it('should handle API errors gracefully', async () => {
  // Mock API failure
  mockOpenAI.chat.completions.create.mockRejectedValue(
    new Error('API Error')
  );

  // Test error handling behavior
});
```

### Accessibility Tests

```typescript
it('should support keyboard navigation', async () => {
  const { user } = renderWithJodex(<Component />);

  await user.tab();
  expect(screen.getByRole('button')).toHaveFocus();
});
```

### Performance Tests

```typescript
it('should handle large datasets efficiently', async () => {
  const startTime = performance.now();

  const largeData = MockDataFactory.createConversation(1000);
  render(<Component messages={largeData} />);

  const endTime = performance.now();
  expect(endTime - startTime).toBeLessThan(1000);
});
```

## Coverage Reports

Run tests with coverage:

```bash
npm test -- --coverage
```

Coverage reports are generated in:
- Text output in console
- JSON in `coverage/coverage-final.json`
- HTML report in `coverage/lcov-report/index.html`

## Best Practices

1. **Use descriptive test names** that explain what is being tested
2. **Mock external dependencies** to ensure isolated testing
3. **Use test utilities** to reduce code duplication
4. **Test happy paths and error cases**
5. **Include accessibility testing** for UI components
6. **Verify performance** with large datasets
7. **Test cross-browser compatibility** through feature detection mocks

## Debugging Tests

### Individual Test Files

```bash
npm test -- src/__tests__/components/ChatInterface.test.tsx
```

### Verbose Output

```bash
npm test -- --reporter=verbose
```

### Watch Mode

```bash
npm test -- --watch
```

### UI Mode

```bash
npm run test:ui
```

## Continuous Integration

The test suite is configured to:
- Run all tests before commits
- Generate coverage reports
- Fail builds on test failures
- Test across different browser environments

## Contributing

When adding new tests:
1. Follow the existing file structure
2. Use the provided test utilities
3. Include mock data generators
4. Add appropriate error handling tests
5. Update this README if adding new patterns

## Troubleshooting

### Common Issues

1. **React 19 Compatibility**: Use the provided render utilities
2. **Missing Mocks**: Check the `mocks/external.ts` file
3. **Async Tests**: Use proper `await` and `waitFor` patterns
4. **Browser API Mocks**: Ensure proper setup in `setup.ts`

### Test Fails intermittently

- Use proper cleanup in `afterEach`
- Mock timers with `vi.useFakeTimers()`
- Clear all mocks between tests
- Use deterministic mock data

### Memory Leaks

- Clean up event listeners
- Disconnect WebSocket connections
- Clear timers and intervals
- Properly dispose of media streams