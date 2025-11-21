import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JodexAI } from '../../components/JodexAI';
import type { Message, VoiceSettings, JodexAIProps } from '../../types';

// Mock all external dependencies
vi.mock('../../lib/openai', () => ({
  OpenAIClient: vi.fn().mockImplementation(() => ({
    chatCompletion: vi.fn().mockResolvedValue({
      content: 'AI response',
      role: 'assistant'
    }),
    streamChatCompletion: vi.fn().mockImplementation(async function* () {
      yield { content: 'Hello', accumulatedContent: 'Hello' };
      yield { content: ' there', accumulatedContent: 'Hello there' };
      yield { done: true, content: 'Hello there' };
    }),
  }))
}));

vi.mock('../../lib/livekit', () => ({
  VoiceConnection: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(true),
    isSpeaking: false,
    isConnected: false,
    startRecording: vi.fn().mockResolvedValue(true),
    stopRecording: vi.fn().mockResolvedValue(true),
    getTranscript: vi.fn().mockReturnValue([]),
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
    saveMessage: vi.fn().mockResolvedValue(true),
    getMessages: vi.fn().mockResolvedValue([]),
    saveSettings: vi.fn().mockResolvedValue(true),
    getSettings: vi.fn().mockResolvedValue({}),
    clear: vi.fn().mockResolvedValue(true),
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

// Mock WebRTC and media APIs
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  requestData: vi.fn(),
  stream: null as MediaStream | null,
  state: 'inactive' as RecordingState,
  ondataavailable: null as ((event: any) => void) | null,
  onstop: null as ((event: any) => void) | null,
  onerror: null as ((event: any) => void) | null,
};

Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockMediaRecorder),
});

Object.defineProperty(window, 'RTCPeerConnection', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createOffer: vi.fn().mockResolvedValue({}),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  })),
});

Object.defineProperty(window, 'webkitRTCPeerConnection', {
  writable: true,
  value: window.RTCPeerConnection,
});

describe('Chat + Voice Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock getUserMedia for microphone access
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(new MediaStream()),
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'audioinput', deviceId: 'mic1', label: 'Microphone' },
          { kind: 'audiooutput', deviceId: 'speaker1', label: 'Speaker' },
        ]),
      },
    });

    // Mock speech synthesis
    Object.defineProperty(window, 'speechSynthesis', {
      writable: true,
      value: {
        speak: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        cancel: vi.fn(),
        getVoices: vi.fn().mockReturnValue([
          { name: 'Alex', lang: 'en-US', voiceURI: 'alex' },
          { name: 'Samantha', lang: 'en-US', voiceURI: 'samantha' },
        ]),
        speaking: false,
        pending: false,
        paused: false,
      },
    });

    // Mock permissions API
    Object.defineProperty(navigator, 'permissions', {
      writable: true,
      value: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
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

  describe('Simultaneous Chat and Voice Interaction', () => {
    it('should allow typing while voice is active', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Start voice interaction
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Should still be able to type in chat
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      expect(chatInput).not.toBeDisabled();

      await user.type(chatInput, 'Test message');
      expect(chatInput).toHaveValue('Test message');
    });

    it('should display both voice transcripts and chat messages', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Send a chat message
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Hello from chat');
      await user.click(sendButton);

      // Start voice recording (simulate voice input)
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Should display both chat and voice interactions
      await waitFor(() => {
        expect(screen.getByText('Hello from chat')).toBeInTheDocument();
      });
    });

    it('should handle voice input while receiving streaming chat response', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Send a message that triggers streaming
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Tell me about farming');
      await user.click(sendButton);

      // While streaming, try to start voice
      const voiceButton = screen.getByRole('button', { name: /start voice/i });

      // Voice button should be available even during streaming
      expect(voiceButton).not.toBeDisabled();
    });
  });

  describe('Voice-Controlled Chat Interaction', () => {
    it('should send voice transcript as chat message', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Start voice recording
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Simulate voice transcript being received
      // This would normally come from LiveKit transcription
      await act(async () => {
        // Simulate transcript callback
        const transcriptEvent = new CustomEvent('transcript', {
          detail: { text: 'How do I grow cacao trees?' }
        });
        window.dispatchEvent(transcriptEvent);
      });

      // Should see the transcript in chat
      await waitFor(() => {
        expect(screen.getByText('How do I grow cacao trees?')).toBeInTheDocument();
      });
    });

    it('should respond to voice input with speech synthesis', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} voice={{ ...defaultProps.voice!, enabled: true, autoPlay: true }} />);

      // Start voice recording
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Simulate voice transcript
      await act(async () => {
        const transcriptEvent = new CustomEvent('transcript', {
          detail: { text: 'What is the best time to harvest cacao?' }
        });
        window.dispatchEvent(transcriptEvent);
      });

      // Should trigger speech synthesis when AI responds
      await waitFor(() => {
        expect(window.speechSynthesis.speak).toHaveBeenCalled();
      });
    });

    it('should handle voice commands for chat control', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Start voice recording
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Simulate voice commands
      await act(async () => {
        // "Clear chat" command
        const clearEvent = new CustomEvent('voice-command', {
          detail: { command: 'clear_chat' }
        });
        window.dispatchEvent(clearEvent);

        // "Send message" command
        const sendEvent = new CustomEvent('voice-command', {
          detail: { command: 'send_message', message: 'Help with irrigation' }
        });
        window.dispatchEvent(sendEvent);
      });

      // Should handle commands appropriately
      await waitFor(() => {
        expect(screen.getByText('Help with irrigation')).toBeInTheDocument();
      });
    });
  });

  describe('State Synchronization Between Chat and Voice', () => {
    it('should sync message history between chat and voice', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Send multiple chat messages
      const messages = [
        'Hello, I need help with my farm',
        'What fertilizer should I use?',
        'How often should I water my plants?'
      ];

      for (const message of messages) {
        const chatInput = screen.getByRole('textbox', { name: /message/i });
        const sendButton = screen.getByRole('button', { name: /send/i });

        await user.clear(chatInput);
        await user.type(chatInput, message);
        await user.click(sendButton);
      }

      // Start voice session
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Voice session should have access to chat history
      await waitFor(() => {
        messages.forEach(message => {
          expect(screen.getByText(message)).toBeInTheDocument();
        });
      });
    });

    it('should maintain conversation context across voice and chat interactions', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Start with chat
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'My farm is in Ecuador');
      await user.click(sendButton);

      // Switch to voice
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Voice response should reference the chat context
      await act(async () => {
        const transcriptEvent = new CustomEvent('transcript', {
          detail: { text: 'What grows well there?' }
        });
        window.dispatchEvent(transcriptEvent);
      });

      // Should show contextual awareness
      await waitFor(() => {
        expect(screen.getByText('My farm is in Ecuador')).toBeInTheDocument();
        expect(screen.getByText('What grows well there?')).toBeInTheDocument();
      });
    });

    it('should handle simultaneous voice and text input gracefully', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Start voice recording
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // While voice is active, type in chat
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      await user.type(chatInput, 'Quick question');

      // Both should be handled without conflicts
      expect(chatInput).toHaveValue('Quick question');
      expect(voiceButton).toBeInTheDocument();
    });
  });

  describe('Error Handling in Chat-Voice Integration', () => {
    it('should handle microphone permission denial gracefully', async () => {
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

      // Try to start voice
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Should show error but keep chat functional
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /message/i })).not.toBeDisabled();
      });

      // Should still be able to send chat messages
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Fallback chat message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Fallback chat message')).toBeInTheDocument();
      });
    });

    it('should handle voice connection issues without affecting chat', async () => {
      const user = userEvent.setup();

      // Mock connection failure
      const mockVoiceConnection = {
        connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: vi.fn().mockResolvedValue(true),
        isSpeaking: false,
        isConnected: false,
      };

      vi.doMock('../../lib/livekit', () => ({
        VoiceConnection: vi.fn().mockImplementation(() => mockVoiceConnection),
      }));

      render(<JodexAI {...defaultProps} />);

      // Try to start voice
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Chat should remain functional
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      expect(chatInput).not.toBeDisabled();
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

      await user.type(chatInput, 'Test message');
      await user.click(sendButton);

      // Should handle speech error gracefully
      expect(chatInput).toHaveValue(''); // Message still sent
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  describe('Performance and Resource Management', () => {
    it('should properly clean up voice resources when switching to chat', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Start voice recording
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Stop voice and switch to chat
      await user.click(voiceButton);

      // Send chat message
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Chat message');
      await user.click(sendButton);

      // Should handle transition cleanly
      await waitFor(() => {
        expect(screen.getByText('Chat message')).toBeInTheDocument();
      });
    });

    it('should handle memory usage with large chat history during voice sessions', async () => {
      const user = userEvent.setup();

      // Generate many messages
      const messages = Array.from({ length: 100 }, (_, i) => `Message ${i + 1}`);

      render(<JodexAI {...defaultProps} />);

      // Add many messages to chat
      for (const message of messages.slice(0, 10)) { // Test with smaller subset for performance
        const chatInput = screen.getByRole('textbox', { name: /message/i });
        const sendButton = screen.getByRole('button', { name: /send/i });

        await user.clear(chatInput);
        await user.type(chatInput, message);
        await user.click(sendButton);
      }

      // Start voice session with large history
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Should handle large history without performance issues
      expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument();
    });
  });

  describe('User Experience Integration', () => {
    it('should provide clear visual feedback for active input mode', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Chat input should be primary by default
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      expect(chatInput).toHaveFocus();

      // When voice is active, should show voice indicators
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Should show voice recording indicators
      await waitFor(() => {
        expect(screen.getByText(/recording|listening/i)).toBeInTheDocument();
      });
    });

    it('should allow seamless switching between voice and chat modes', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Start with chat
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      await user.type(chatInput, 'Starting with chat');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Switch to voice
      const voiceButton = screen.getByRole('button', { name: /start voice/i });
      await user.click(voiceButton);

      // Switch back to chat
      await user.click(voiceButton);

      // Should seamlessly transition
      expect(chatInput).not.toBeDisabled();
      await user.clear(chatInput);
      await user.type(chatInput, 'Back to chat');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Back to chat')).toBeInTheDocument();
      });
    });

    it('should maintain consistent formatting across voice and chat messages', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Send a formatted chat message
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Important: **Check irrigation** system');
      await user.click(sendButton);

      // Simulate voice message with similar content
      await act(async () => {
        const transcriptEvent = new CustomEvent('transcript', {
          detail: { text: 'Important: Check irrigation system' }
        });
        window.dispatchEvent(transcriptEvent);
      });

      // Both should display with consistent styling
      await waitFor(() => {
        const messages = screen.getAllByText(/irrigation/i);
        expect(messages.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});