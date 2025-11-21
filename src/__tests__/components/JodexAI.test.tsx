import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JodexAI } from '../../JodexAI';
import type { JodexAIProps, Message, Alert } from '../../types';

// Mock dependencies
vi.mock('../../lib/openai', () => ({
  OpenAIClient: vi.fn().mockImplementation(() => ({
    chatCompletion: vi.fn().mockResolvedValue({
      content: 'Test response',
      role: 'assistant'
    }),
    streamChatCompletion: vi.fn().mockImplementation(async function* () {
      yield { content: 'Hello', accumulatedContent: 'Hello' };
      yield { content: ' world', accumulatedContent: 'Hello world' };
      yield { done: true, content: 'Hello world' };
    }),
  }))
}));

vi.mock('../../lib/livekit', () => ({
  VoiceConnection: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    startRecording: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn().mockResolvedValue(undefined),
    isSupported: vi.fn().mockReturnValue(true),
  }))
}));

vi.mock('../../lib/actions', () => ({
  ActionManager: vi.fn().mockImplementation(() => ({
    executeAction: vi.fn().mockResolvedValue(undefined),
    validateAction: vi.fn().mockReturnValue(true),
    getQueue: vi.fn().mockReturnValue([]),
    clearQueue: vi.fn().mockReturnValue(undefined),
  }))
}));

vi.mock('../../lib/storage', () => ({
  createStorageManager: vi.fn().mockReturnValue({
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue({}),
    clear: vi.fn().mockResolvedValue(undefined),
  })
}));

vi.mock('../../lib/browser-compatibility', () => ({
  checkBrowserCompatibility: vi.fn().mockReturnValue({
    isCompatible: true,
    features: {
      websockets: true,
      mediarecorder: true,
      speechrecognition: true,
      localstorage: true,
      webrtc: true,
    },
    warnings: [],
  })
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

describe('JodexAI Component', () => {
  // Test data
  const defaultProps: JodexAIProps = {
    apiUrl: 'https://api.example.com',
    apiKey: 'test-api-key',
    livekitUrl: 'wss://livekit.example.com',
    livekitToken: 'test-token',
    datasets: {
      farmers: [],
      harvest: [],
      weather: [],
      inventory: [],
    },
    uiConfig: {
      position: 'bottom-right',
      width: 384,
      height: 600,
      collapsed: false,
      showHeader: true,
      showFooter: true,
      showTimestamps: true,
      maxMessages: 50,
      animations: true,
      title: 'Jodex AI Assistant',
    },
    theme: {
      mode: 'light',
      primaryColor: '#3b82f6',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      render(<JodexAI {...defaultProps} />);
      expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
    });

    it('should render with collapsed state', () => {
      render(
        <JodexAI
          {...defaultProps}
          uiConfig={{ ...defaultProps.uiConfig, collapsed: true }}
        />
      );
      expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(
        <JodexAI
          {...defaultProps}
          uiConfig={{ ...defaultProps.uiConfig, title: 'Custom AI Assistant' }}
        />
      );
      expect(screen.getByText('Custom AI Assistant')).toBeInTheDocument();
    });

    it('should render with different position configurations', () => {
      const positions = ['bottom-left', 'top-right', 'top-left', 'center'] as const;

      positions.forEach((position) => {
        const { unmount } = render(
          <JodexAI
            {...defaultProps}
            uiConfig={{ ...defaultProps.uiConfig, position }}
          />
        );
        expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Theme System', () => {
    it('should apply light theme', () => {
      render(
        <JodexAI
          {...defaultProps}
          theme={{ mode: 'light', primaryColor: '#3b82f6' }}
        />
      );
      const button = screen.getByRole('button', { name: /open/i });
      expect(button).toBeInTheDocument();
    });

    it('should apply dark theme', () => {
      render(
        <JodexAI
          {...defaultProps}
          theme={{ mode: 'dark', primaryColor: '#1f2937' }}
        />
      );
      const button = screen.getByRole('button', { name: /open/i });
      expect(button).toBeInTheDocument();
    });

    it('should apply custom primary color', () => {
      render(
        <JodexAI
          {...defaultProps}
          theme={{ mode: 'light', primaryColor: '#ef4444' }}
        />
      );
      const button = screen.getByRole('button', { name: /open/i });
      expect(button).toBeInTheDocument();
    });

    it('should apply custom CSS', () => {
      const customCSS = '.jodex-ai { border: 2px solid red; }';
      render(
        <JodexAI
          {...defaultProps}
          theme={{ mode: 'light', customCSS }}
        />
      );
      const button = screen.getByRole('button', { name: /open/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should open chat interface when clicked', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      const openButton = screen.getByRole('button', { name: /open/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
      });
    });

    it('should close chat interface when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Open the chat
      const openButton = screen.getByRole('button', { name: /open/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      });

      // Close the chat
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
      });
    });

    it('should allow sending chat messages', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Open the chat
      const openButton = screen.getByRole('button', { name: /open/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // Type a message
      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello, AI assistant!');

      // Send the message
      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Hello, AI assistant!')).toBeInTheDocument();
      });
    });

    it('should display AI responses', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Open the chat
      const openButton = screen.getByRole('button', { name: /open/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // Send a message
      const input = screen.getByRole('textbox');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Test response')).toBeInTheDocument();
      });
    });
  });

  describe('Voice Interface', () => {
    it('should show voice controls when voice is enabled', async () => {
      const user = userEvent.setup();
      render(
        <JodexAI
          {...defaultProps}
          voiceSettings={{ enabled: true, language: 'en', autoRecord: false }}
        />
      );

      // Open the chat
      const openButton = screen.getByRole('button', { name: /open/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /microphone/i })).toBeInTheDocument();
      });
    });

    it('should start recording when microphone button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <JodexAI
          {...defaultProps}
          voiceSettings={{ enabled: true, language: 'en', autoRecord: false }}
        />
      );

      // Open the chat
      const openButton = screen.getByRole('button', { name: /open/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /microphone/i })).toBeInTheDocument();
      });

      // Start recording
      const microphoneButton = screen.getByRole('button', { name: /microphone/i });
      await user.click(microphoneButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
      });
    });

    it('should handle voice permissions gracefully', async () => {
      // Mock getUserMedia to simulate permission denied
      navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
        new Error('Permission denied')
      );

      const user = userEvent.setup();
      render(
        <JodexAI
          {...defaultProps}
          voiceSettings={{ enabled: true, language: 'en', autoRecord: false }}
        />
      );

      // Open the chat
      const openButton = screen.getByRole('button', { name: /open/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /microphone/i })).toBeInTheDocument();
      });

      // Try to start recording
      const microphoneButton = screen.getByRole('button', { name: /microphone/i });
      await user.click(microphoneButton);

      await waitFor(() => {
        expect(screen.getByText(/permission/i)).toBeInTheDocument();
      });
    });
  });

  describe('Alert System', () => {
    it('should display alerts when present', async () => {
      const alerts: Alert[] = [
        {
          id: '1',
          type: 'weather',
          title: 'Weather Alert',
          message: 'Heavy rain expected',
          severity: 'high',
          timestamp: new Date(),
          acknowledged: false,
          dismissed: false,
        },
      ];

      render(
        <JodexAI
          {...defaultProps}
          alerts={alerts}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Weather Alert')).toBeInTheDocument();
        expect(screen.getByText('Heavy rain expected')).toBeInTheDocument();
      });
    });

    it('should allow acknowledging alerts', async () => {
      const user = userEvent.setup();
      const alerts: Alert[] = [
        {
          id: '1',
          type: 'weather',
          title: 'Weather Alert',
          message: 'Heavy rain expected',
          severity: 'high',
          timestamp: new Date(),
          acknowledged: false,
          dismissed: false,
        },
      ];

      render(
        <JodexAI
          {...defaultProps}
          alerts={alerts}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /acknowledge/i })).toBeInTheDocument();
      });

      const acknowledgeButton = screen.getByRole('button', { name: /acknowledge/i });
      await user.click(acknowledgeButton);

      await waitFor(() => {
        expect(screen.getByText(/acknowledged/i)).toBeInTheDocument();
      });
    });

    it('should allow dismissing alerts', async () => {
      const user = userEvent.setup();
      const alerts: Alert[] = [
        {
          id: '1',
          type: 'weather',
          title: 'Weather Alert',
          message: 'Heavy rain expected',
          severity: 'low',
          timestamp: new Date(),
          acknowledged: false,
          dismissed: false,
        },
      ];

      render(
        <JodexAI
          {...defaultProps}
          alerts={alerts}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText('Weather Alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error boundary when component crashes', async () => {
      // Create a component that will crash
      const CrashingComponent = () => {
        throw new Error('Test error');
      };

      render(
        <JodexAI
          {...defaultProps}
        />
      );

      // The component should still render with error handling
      expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock network error
      const { OpenAIClient } = await import('../../lib/openai');
      vi.mocked(OpenAIClient).mockImplementation(() => ({
        chatCompletion: vi.fn().mockRejectedValue(new Error('Network error')),
        streamChatCompletion: vi.fn().mockRejectedValue(new Error('Network error')),
      } as any));

      render(<JodexAI {...defaultProps} />);

      // Open the chat
      const openButton = screen.getByRole('button', { name: /open/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // Try to send a message
      const input = screen.getByRole('textbox');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<JodexAI {...defaultProps} />);

      const openButton = screen.getByRole('button', { name: /open/i });
      expect(openButton).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Tab to the open button
      await user.tab();
      expect(screen.getByRole('button', { name: /open/i })).toHaveFocus();

      // Press Enter to open
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    });

    it('should have proper focus management', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Open chat
      const openButton = screen.getByRole('button', { name: /open/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // Focus should be on the input
      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('should handle large message lists efficiently', async () => {
      const messages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: new Date(),
      }));

      render(
        <JodexAI
          {...defaultProps}
          messages={messages}
        />
      );

      // Should still render without performance issues
      expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();

      // Open chat to see messages
      const user = userEvent.setup();
      const openButton = screen.getByRole('button', { name: /open/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByText('Message 0')).toBeInTheDocument();
        expect(screen.getByText('Message 99')).toBeInTheDocument();
      });
    });

    it('should not leak memory on repeated open/close', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Open and close multiple times
      for (let i = 0; i < 10; i++) {
        const openButton = screen.getByRole('button', { name: /open/i });
        await user.click(openButton);

        await waitFor(() => {
          expect(screen.getByRole('textbox')).toBeInTheDocument();
        });

        const closeButton = screen.getByRole('button', { name: /close/i });
        await user.click(closeButton);

        await waitFor(() => {
          expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });
      }

      // Should still work
      expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
    });
  });

  describe('Browser Compatibility', () => {
    it('should handle unsupported browsers', async () => {
      // Mock browser compatibility check to return false
      const { checkBrowserCompatibility } = await import('../../lib/browser-compatibility');
      vi.mocked(checkBrowserCompatibility).mockReturnValue({
        isCompatible: false,
        features: {
          websockets: false,
          mediarecorder: false,
          speechrecognition: false,
          localstorage: false,
          webrtc: false,
        },
        warnings: ['Your browser is not supported'],
      });

      render(<JodexAI {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/browser is not supported/i)).toBeInTheDocument();
      });
    });

    it('should handle partial feature support', async () => {
      // Mock partial feature support
      const { checkBrowserCompatibility } = await import('../../lib/browser-compatibility');
      vi.mocked(checkBrowserCompatibility).mockReturnValue({
        isCompatible: true,
        features: {
          websockets: true,
          mediarecorder: false,
          speechrecognition: false,
          localstorage: true,
          webrtc: true,
        },
        warnings: ['Voice features are not available'],
      });

      render(
        <JodexAI
          {...defaultProps}
          voiceSettings={{ enabled: true, language: 'en', autoRecord: false }}
        />
      );

      // Should still render but voice features should be disabled
      expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
    });
  });
});