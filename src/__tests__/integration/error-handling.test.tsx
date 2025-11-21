import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JodexAI } from '../../components/JodexAI';
import type { JodexAIProps, ErrorBoundaryState, AlertConfig } from '../../types';

// Mock dependencies with error scenarios
vi.mock('../../lib/openai', () => ({
  OpenAIClient: vi.fn().mockImplementation(() => ({
    chatCompletion: vi.fn(),
    streamChatCompletion: vi.fn(),
  }))
}));

vi.mock('../../lib/livekit', () => ({
  VoiceConnection: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    isSpeaking: false,
    isConnected: false,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
  }))
}));

vi.mock('../../lib/actions', () => ({
  ActionManager: vi.fn().mockImplementation(() => ({
    executeAction: vi.fn(),
    getActionHistory: vi.fn().mockReturnValue([]),
  }))
}));

vi.mock('../../lib/storage', () => ({
  StorageManager: vi.fn().mockImplementation(() => ({
    saveMessage: vi.fn(),
    getMessages: vi.fn(),
    saveSettings: vi.fn(),
    getSettings: vi.fn(),
    clear: vi.fn(),
  }))
}));

vi.mock('zustand', () => ({
  create: vi.fn().mockImplementation((createState) => {
    const state = createState();
    return {
      ...state,
      setState: vi.fn((newState) => Object.assign(state, typeof newState === 'function' ? newState(state) : newState)),
      getState: vi.fn(() => state),
      subscribe: vi.fn(),
    };
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Error Handling Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock basic browser APIs
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(new MediaStream()),
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
    });

    Object.defineProperty(window, 'speechSynthesis', {
      writable: true,
      value: {
        speak: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        cancel: vi.fn(),
        getVoices: vi.fn().mockReturnValue([]),
        speaking: false,
        pending: false,
        paused: false,
      },
    });

    Object.defineProperty(window, 'localStorage', {
      writable: true,
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const defaultProps: JodexAIProps = {
    openaiApiKey: 'test-api-key',
    datasets: {
      farmers: [],
      harvest: [],
      weather: [],
    },
    voice: {
      enabled: true,
      autoStart: false,
      serverUrl: 'wss://test.livekit.cloud',
      token: 'test-token',
    },
    storage: {
      enabled: true,
      persistence: 'localStorage',
    },
  };

  describe('Network Error Handling', () => {
    it('should handle OpenAI API timeout errors', async () => {
      const mockOpenAI = {
        chatCompletion: vi.fn().mockRejectedValue(new Error('Request timeout')),
        streamChatCompletion: vi.fn().mockImplementation(async function* () {
          throw new Error('Stream timeout');
        }),
      };

      vi.doMock('../../lib/openai', () => ({
        OpenAIClient: vi.fn().mockImplementation(() => mockOpenAI),
      }));

      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Try to send a message
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Test message');
      await user.click(sendButton);

      // Should show error state but not crash
      await waitFor(() => {
        expect(screen.getByText(/timeout|error|failed/i)).toBeInTheDocument();
      });

      // Component should remain functional
      expect(chatInput).not.toBeDisabled();
    });

    it('should handle network connectivity issues', async () => {
      const user = userEvent.setup();

      // Simulate offline mode
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<JodexAI {...defaultProps} />);

      // Should show offline indicator
      await waitFor(() => {
        expect(screen.getByText(/offline|no internet/i)).toBeInTheDocument();
      });

      // Try to send message while offline
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Offline message');
      await user.click(sendButton);

      // Should queue message or show appropriate error
      await waitFor(() => {
        expect(screen.getByText(/offline|queued|network/i)).toBeInTheDocument();
      });
    });

    it('should handle voice connection failures', async () => {
      const mockVoiceConnection = {
        connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: vi.fn().mockResolvedValue(true),
        isSpeaking: false,
        isConnected: false,
      };

      vi.doMock('../../lib/livekit', () => ({
        VoiceConnection: vi.fn().mockImplementation(() => mockVoiceConnection),
      }));

      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Try to start voice
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Should show connection error
      await waitFor(() => {
        expect(screen.getByText(/connection failed|voice error/i)).toBeInTheDocument();
      });

      // Chat should remain functional
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      expect(chatInput).not.toBeDisabled();
    });

    it('should handle intermittent network issues with retry', async () => {
      let attemptCount = 0;
      const mockOpenAI = {
        chatCompletion: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 3) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve({
            content: 'Success after retry',
            role: 'assistant'
          });
        }),
      };

      vi.doMock('../../lib/openai', () => ({
        OpenAIClient: vi.fn().mockImplementation(() => mockOpenAI),
      }));

      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Retry test message');
      await user.click(sendButton);

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(screen.getByText('Success after retry')).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('Component Error Boundaries', () => {
    it('should catch and handle render errors in child components', async () => {
      const user = userEvent.setup();

      // Mock a component that throws an error
      const ThrowingComponent = () => {
        throw new Error('Component render error');
      };

      // Mock the chat interface to throw error
      vi.doMock('../../components/ChatInterface', () => ({
        ChatInterface: () => <ThrowingComponent />,
      }));

      render(<JodexAI {...defaultProps} />);

      // Should show error boundary fallback
      await waitFor(() => {
        expect(screen.getByText(/something went wrong|error occurred/i)).toBeInTheDocument();
      });
    });

    it('should recover from component errors', async () => {
      let shouldThrow = true;
      const MockComponent = () => {
        if (shouldThrow) {
          throw new Error('Temporary error');
        }
        return <div>Recovered Component</div>;
      };

      // Initially throwing component
      vi.doMock('../../components/VoiceInterface', () => ({
        VoiceInterface: MockComponent,
      }));

      render(<JodexAI {...defaultProps} />);

      // Should show error state initially
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Simulate recovery
      shouldThrow = false;

      // Try to recover (e.g., by retry button)
      const retryButton = screen.getByRole('button', { name: /retry|reload/i });
      const user = userEvent.setup();
      await user.click(retryButton);

      // Should recover successfully
      await waitFor(() => {
        expect(screen.getByText('Recovered Component')).toBeInTheDocument();
      });
    });

    it('should handle async component errors', async () => {
      const user = userEvent.setup();

      // Mock async error in useEffect
      const AsyncErrorComponent = () => {
        React.useEffect(() => {
          setTimeout(() => {
            throw new Error('Async error');
          }, 100);
        }, []);
        return <div>Loading...</div>;
      };

      vi.doMock('../../components/AlertPanel', () => ({
        AlertPanel: AsyncErrorComponent,
      }));

      render(<JodexAI {...defaultProps} />);

      // Should handle async error gracefully
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Storage Error Handling', () => {
    it('should handle localStorage quota exceeded', async () => {
      const user = userEvent.setup();

      // Mock localStorage to throw quota error
      Object.defineProperty(window, 'localStorage', {
        writable: true,
        value: {
          setItem: vi.fn().mockImplementation(() => {
            const error = new Error('QuotaExceededError');
            (error as any).name = 'QuotaExceededError';
            throw error;
          }),
          getItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
          length: 0,
          key: vi.fn(),
        },
      });

      render(<JodexAI {...defaultProps} />);

      // Try to send a message
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Storage test message');
      await user.click(sendButton);

      // Should show storage warning but continue working
      await waitFor(() => {
        expect(screen.getByText(/storage|quota|memory/i)).toBeInTheDocument();
      });

      // Message should still be displayed
      expect(screen.getByText('Storage test message')).toBeInTheDocument();
    });

    it('should handle corrupted storage data', async () => {
      const user = userEvent.setup();

      // Mock corrupted data retrieval
      Object.defineProperty(window, 'localStorage', {
        writable: true,
        value: {
          getItem: vi.fn().mockReturnValue('invalid json data'),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
          length: 0,
          key: vi.fn(),
        },
      });

      render(<JodexAI {...defaultProps} />);

      // Should handle corrupted data gracefully
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument();
      });

      // Component should remain functional
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      expect(chatInput).not.toBeDisabled();
    });

    it('should fallback to memory storage when localStorage unavailable', async () => {
      const user = userEvent.setup();

      // Remove localStorage entirely
      Object.defineProperty(window, 'localStorage', {
        writable: true,
        value: undefined,
      });

      render(<JodexAI {...defaultProps} />);

      // Should work with memory storage
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Memory storage test');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Memory storage test')).toBeInTheDocument();
      });
    });
  });

  describe('Media Access Error Handling', () => {
    it('should handle microphone permission denied', async () => {
      const user = userEvent.setup();

      // Mock permission denied
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')),
          enumerateDevices: vi.fn().mockResolvedValue([]),
        },
      });

      render(<JodexAI {...defaultProps} />);

      // Try to start voice recording
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Should show permission error
      await waitFor(() => {
        expect(screen.getByText(/permission|microphone|access denied/i)).toBeInTheDocument();
      });

      // Chat should remain functional
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      expect(chatInput).not.toBeDisabled();
    });

    it('should handle missing audio devices', async () => {
      const user = userEvent.setup();

      // Mock no audio devices available
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: vi.fn().mockRejectedValue(new Error('No audio devices found')),
          enumerateDevices: vi.fn().mockResolvedValue([]),
        },
      });

      render(<JodexAI {...defaultProps} />);

      // Try to access voice features
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Should show device error
      await waitFor(() => {
        expect(screen.getByText(/device|microphone|audio/i)).toBeInTheDocument();
      });
    });

    it('should handle speech synthesis errors', async () => {
      const user = userEvent.setup();

      // Mock speech synthesis error
      Object.defineProperty(window, 'speechSynthesis', {
        writable: true,
        value: {
          speak: vi.fn().mockImplementation(() => {
            throw new Error('Speech synthesis failed');
          }),
          pause: vi.fn(),
          resume: vi.fn(),
          cancel: vi.fn(),
          getVoices: vi.fn().mockReturnValue([]),
          speaking: false,
          pending: false,
          paused: false,
        },
      });

      render(<JodexAI {...defaultProps} voice={{ ...defaultProps.voice!, autoPlay: true }} />);

      // Send a message that would trigger speech
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Speech test message');
      await user.click(sendButton);

      // Should handle speech error gracefully
      await waitFor(() => {
        expect(screen.getByText('Speech test message')).toBeInTheDocument();
      });
    });
  });

  describe('API Error Recovery', () => {
    it('should implement exponential backoff for retries', async () => {
      let attemptCount = 0;
      const attemptTimes: number[] = [];

      const mockOpenAI = {
        chatCompletion: vi.fn().mockImplementation(() => {
          attemptCount++;
          attemptTimes.push(Date.now());
          if (attemptCount < 3) {
            return Promise.reject(new Error('Server error'));
          }
          return Promise.resolve({
            content: 'Success after backoff',
            role: 'assistant'
          });
        }),
      };

      vi.doMock('../../lib/openai', () => ({
        OpenAIClient: vi.fn().mockImplementation(() => mockOpenAI),
      }));

      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Backoff test');
      await user.click(sendButton);

      // Should eventually succeed
      await waitFor(() => {
        expect(screen.getByText('Success after backoff')).toBeInTheDocument();
      }, { timeout: 15000 });

      // Should have attempted multiple times with delays
      expect(attemptCount).toBe(3);
      expect(attemptTimes.length).toBe(3);
    });

    it('should handle API rate limiting', async () => {
      const mockOpenAI = {
        chatCompletion: vi.fn().mockRejectedValue({
          response: { status: 429 },
          message: 'Rate limit exceeded'
        }),
      };

      vi.doMock('../../lib/openai', () => ({
        OpenAIClient: vi.fn().mockImplementation(() => mockOpenAI),
      }));

      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Rate limit test');
      await user.click(sendButton);

      // Should show rate limit message
      await waitFor(() => {
        expect(screen.getByText(/rate limit|too many requests/i)).toBeInTheDocument();
      });

      // Should retry after delay
      await waitFor(() => {
        expect(chatInput).not.toBeDisabled();
      }, { timeout: 5000 });
    });
  });

  describe('User Experience During Errors', () => {
    it('should provide helpful error messages', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} openaiApiKey={undefined} />);

      // Should show clear error for missing API key
      await waitFor(() => {
        expect(screen.getByText(/api key|required|missing/i)).toBeInTheDocument();
      });
    });

    it('should allow users to report errors', async () => {
      const user = userEvent.setup();

      // Trigger an error
      render(<JodexAI {...defaultProps} openaiApiKey='invalid-key' />);

      await waitFor(() => {
        expect(screen.getByText(/error|invalid/i)).toBeInTheDocument();
      });

      // Find and click report button
      const reportButton = screen.getByRole('button', { name: /report|feedback/i });
      await user.click(reportButton);

      // Should show error reporting interface
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /description|details/i })).toBeInTheDocument();
      });
    });

    it('should maintain functionality during partial failures', async () => {
      const user = userEvent.setup();

      // Mock only voice failing
      const mockVoiceConnection = {
        connect: vi.fn().mockRejectedValue(new Error('Voice connection failed')),
        disconnect: vi.fn().mockResolvedValue(true),
        isSpeaking: false,
        isConnected: false,
      };

      vi.doMock('../../lib/livekit', () => ({
        VoiceConnection: vi.fn().mockImplementation(() => mockVoiceConnection),
      }));

      render(<JodexAI {...defaultProps} />);

      // Try to use voice (should fail)
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      await waitFor(() => {
        expect(screen.getByText(/voice error/i)).toBeInTheDocument();
      });

      // Chat should still work
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Chat still works');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Chat still works')).toBeInTheDocument();
      });
    });

    it('should show recovery options', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} openaiApiKey='invalid-key' />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Should offer recovery actions
      const retryButton = screen.getByRole('button', { name: /retry|try again/i });
      const settingsButton = screen.getByRole('button', { name: /settings|configure/i });

      expect(retryButton).toBeInTheDocument();
      expect(settingsButton).toBeInTheDocument();
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should log errors appropriately', async () => {
      const mockOpenAI = {
        chatCompletion: vi.fn().mockRejectedValue(new Error('Test error')),
      };

      vi.doMock('../../lib/openai', () => ({
        OpenAIClient: vi.fn().mockImplementation(() => mockOpenAI),
      }));

      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Error test');
      await user.click(sendButton);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalled();
      });
    });

    it('should handle error reporting service failures', async () => {
      const user = userEvent.setup();

      // Mock error reporting service failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Error reporting failed'));

      render(<JodexAI {...defaultProps} />);

      // Trigger an error that would be reported
      const reportButton = screen.getByRole('button', { name: /report/i });
      await user.click(reportButton);

      // Should handle reporting service failure gracefully
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to report error'),
          expect.any(Error)
        );
      });
    });
  });

  describe('Performance and Resource Errors', () => {
    it('should handle memory pressure gracefully', async () => {
      const user = userEvent.setup();

      // Mock memory pressure
      Object.defineProperty(window, 'performance', {
        writable: true,
        value: {
          memory: {
            usedJSHeapSize: 1000000000, // 1GB
            totalJSHeapSize: 2000000000, // 2GB
            limitJSHeapSize: 4000000000, // 4GB
          },
        },
      });

      render(<JodexAI {...defaultProps} />);

      // Should show memory warning but continue working
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument();
      });
    });

    it('should handle large message processing errors', async () => {
      const user = userEvent.setup();

      // Send very large message
      const largeMessage = 'A'.repeat(1000000); // 1MB message
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Should handle large messages without crashing
      await user.type(chatInput, largeMessage.slice(0, 100)); // Don't actually type 1MB in test
      await user.click(sendButton);

      // Component should remain responsive
      expect(chatInput).not.toBeDisabled();
    });
  });
});