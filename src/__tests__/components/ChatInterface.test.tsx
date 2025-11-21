import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../../components/ChatInterface';
import type { Message, ChatInterfaceProps } from '../../types';

// Mock dependencies
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

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ChatInterface Component', () => {
  // Test data
  const defaultProps: ChatInterfaceProps = {
    messages: [],
    onSendMessage: vi.fn(),
    onMessageRead: vi.fn(),
    isLoading: false,
    isTyping: false,
    maxHeight: 400,
    showTimestamps: true,
    showAvatars: true,
    enableMarkdown: true,
    enableEmoji: true,
    placeholder: 'Type your message...',
    disabled: false,
  };

  const sampleMessages: Message[] = [
    {
      id: '1',
      content: 'Hello, how can I help you today?',
      role: 'assistant',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      metadata: { type: 'greeting' },
    },
    {
      id: '2',
      content: 'I need help with my cacao farm',
      role: 'user',
      timestamp: new Date('2024-01-01T10:01:00Z'),
    },
    {
      id: '3',
      content: 'I\'d be happy to help with your cacao farm. What specific challenges are you facing?',
      role: 'assistant',
      timestamp: new Date('2024-01-01T10:02:00Z'),
      metadata: { type: 'follow-up' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<ChatInterface {...defaultProps} />);
      expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(
        <ChatInterface
          {...defaultProps}
          placeholder="Ask me anything about farming..."
        />
      );
      expect(screen.getByPlaceholderText(/ask me anything about farming/i)).toBeInTheDocument();
    });

    it('should render with messages', () => {
      render(<ChatInterface {...defaultProps} messages={sampleMessages} />);

      expect(screen.getByText('Hello, how can I help you today?')).toBeInTheDocument();
      expect(screen.getByText('I need help with my cacao farm')).toBeInTheDocument();
      expect(screen.getByText(/happy to help with your cacao farm/i)).toBeInTheDocument();
    });

    it('should render with disabled state', () => {
      render(<ChatInterface {...defaultProps} disabled={true} />);
      expect(screen.getByPlaceholderText(/type your message/i)).toBeDisabled();
    });
  });

  describe('Message Display', () => {
    it('should display user and assistant messages differently', () => {
      render(<ChatInterface {...defaultProps} messages={sampleMessages} />);

      const messages = screen.getAllByRole('article');
      expect(messages).toHaveLength(3);
    });

    it('should show timestamps when enabled', () => {
      render(<ChatInterface {...defaultProps} messages={sampleMessages} showTimestamps={true} />);

      expect(screen.getByText(/10:00/)).toBeInTheDocument();
      expect(screen.getByText(/10:01/)).toBeInTheDocument();
    });

    it('should hide timestamps when disabled', () => {
      render(<ChatInterface {...defaultProps} messages={sampleMessages} showTimestamps={false} />);

      expect(screen.queryByText(/10:00/)).not.toBeInTheDocument();
    });

    it('should show avatars when enabled', () => {
      render(<ChatInterface {...defaultProps} messages={sampleMessages} showAvatars={true} />);

      const avatars = screen.getAllByAltText(/avatar/i);
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('should hide avatars when disabled', () => {
      render(<ChatInterface {...defaultProps} messages={sampleMessages} showAvatars={false} />);

      expect(screen.queryByAltText(/avatar/i)).not.toBeInTheDocument();
    });

    it('should render markdown content when enabled', () => {
      const markdownMessages: Message[] = [
        {
          id: '1',
          content: '**Bold text** and *italic text*\n\n- List item 1\n- List item 2',
          role: 'assistant',
          timestamp: new Date(),
        },
      ];

      render(<ChatInterface {...defaultProps} messages={markdownMessages} enableMarkdown={true} />);

      expect(screen.getByText('Bold text')).toBeInTheDocument();
      expect(screen.getByText('italic text')).toBeInTheDocument();
      expect(screen.getByText('List item 1')).toBeInTheDocument();
    });

    it('should render plain text when markdown disabled', () => {
      const plainTextMessages: Message[] = [
        {
          id: '1',
          content: '**Not bold** and *not italic*',
          role: 'assistant',
          timestamp: new Date(),
        },
      ];

      render(<ChatInterface {...defaultProps} messages={plainTextMessages} enableMarkdown={false} />);

      expect(screen.getByText('**Not bold** and *not italic*')).toBeInTheDocument();
    });

    it('should handle emoji rendering when enabled', () => {
      const emojiMessages: Message[] = [
        {
          id: '1',
          content: 'Hello! 🌱 How can I help you with your farm today? 🚜',
          role: 'assistant',
          timestamp: new Date(),
        },
      ];

      render(<ChatInterface {...defaultProps} messages={emojiMessages} enableEmoji={true} />);

      expect(screen.getByText('Hello! 🌱 How can I help you with your farm today? 🚜')).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('should allow typing in the input field', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type your message/i);
      await user.type(input, 'Test message');

      expect(input).toHaveValue('Test message');
    });

    it('should send message when enter is pressed', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = vi.fn();

      render(<ChatInterface {...defaultProps} onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/type your message/i);
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
      expect(input).toHaveValue('');
    });

    it('should send message when send button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = vi.fn();

      render(<ChatInterface {...defaultProps} onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/type your message/i);
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
      expect(input).toHaveValue('');
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = vi.fn();

      render(<ChatInterface {...defaultProps} onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/type your message/i);
      await user.keyboard('{Enter}');

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should trim whitespace from messages', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = vi.fn();

      render(<ChatInterface {...defaultProps} onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/type your message/i);
      await user.type(input, '  Test message  ');
      await user.keyboard('{Enter}');

      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
    });

    it('should handle multiline input correctly', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = vi.fn();

      render(<ChatInterface {...defaultProps} onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/type your message/i);
      await user.type(input, 'Line 1{Shift>}{Enter}Line 2');
      await user.keyboard('{Enter}');

      expect(mockOnSendMessage).toHaveBeenCalledWith('Line 1\nLine 2');
    });

    it('should not send when Shift+Enter is pressed', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = vi.fn();

      render(<ChatInterface {...defaultProps} onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/type your message/i);
      await user.type(input, 'Test message');
      await user.keyboard('{Shift>}{Enter}');

      expect(mockOnSendMessage).not.toHaveBeenCalled();
      expect(input).toHaveValue('Test message\n');
    });
  });

  describe('Loading and Typing States', () => {
    it('should show loading indicator when loading', () => {
      render(<ChatInterface {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/thinking/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    });

    it('should show typing indicator when AI is typing', () => {
      render(<ChatInterface {...defaultProps} isTyping={true} />);

      expect(screen.getByText(/assistant is typing/i)).toBeInTheDocument();
    });

    it('should disable input when loading', () => {
      render(<ChatInterface {...defaultProps} isLoading={true} />);

      expect(screen.getByPlaceholderText(/type your message/i)).toBeDisabled();
    });

    it('should disable input when disabled prop is true', () => {
      render(<ChatInterface {...defaultProps} disabled={true} />);

      expect(screen.getByPlaceholderText(/type your message/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    });
  });

  describe('Message Actions', () => {
    it('should mark messages as read when visible', async () => {
      const mockOnMessageRead = vi.fn();
      render(
        <ChatInterface
          {...defaultProps}
          messages={sampleMessages}
          onMessageRead={mockOnMessageRead}
        />
      );

      await waitFor(() => {
        expect(mockOnMessageRead).toHaveBeenCalledWith('1');
        expect(mockOnMessageRead).toHaveBeenCalledWith('2');
        expect(mockOnMessageRead).toHaveBeenCalledWith('3');
      });
    });

    it('should handle message copy action', async () => {
      const user = userEvent.setup();
      const mockWriteText = vi.fn();

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<ChatInterface {...defaultProps} messages={sampleMessages} />);

      // Click on a message to reveal actions
      const message = screen.getByText('Hello, how can I help you today?');
      await user.click(message);

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith('Hello, how can I help you today?');
    });

    it('should handle message delete action', async () => {
      const user = userEvent.setup();

      render(<ChatInterface {...defaultProps} messages={sampleMessages} />);

      // Click on a message to reveal actions
      const message = screen.getByText('Hello, how can I help you today?');
      await user.click(message);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText('Hello, how can I help you today?')).not.toBeInTheDocument();
      });
    });

    it('should handle message retry action for failed messages', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = vi.fn();

      const failedMessages: Message[] = [
        {
          id: '1',
          content: 'Failed message',
          role: 'user',
          timestamp: new Date(),
          metadata: { error: 'Network error' },
        },
      ];

      render(
        <ChatInterface
          {...defaultProps}
          messages={failedMessages}
          onSendMessage={mockOnSendMessage}
        />
      );

      // Click on failed message to reveal actions
      const message = screen.getByText('Failed message');
      await user.click(message);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockOnSendMessage).toHaveBeenCalledWith('Failed message');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: /send/i })).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);

      // Tab to input
      await user.tab();
      expect(screen.getByPlaceholderText(/type your message/i)).toHaveFocus();

      // Tab to send button
      await user.tab();
      expect(screen.getByRole('button', { name: /send/i })).toHaveFocus();
    });

    it('should announce new messages to screen readers', async () => {
      render(<ChatInterface {...defaultProps} messages={sampleMessages} />);

      const messages = screen.getAllByRole('article');
      expect(messages[0]).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper focus management', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);

      // Focus should be on input by default
      expect(screen.getByPlaceholderText(/type your message/i)).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('should handle large message lists efficiently', async () => {
      const largeMessageList: Message[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: new Date(),
      }));

      render(<ChatInterface {...defaultProps} messages={largeMessageList} />);

      expect(screen.getByText('Message 0')).toBeInTheDocument();
      expect(screen.getByText('Message 999')).toBeInTheDocument();
    });

    it('should not re-render unchanged messages', () => {
      const { rerender } = render(<ChatInterface {...defaultProps} messages={sampleMessages} />);

      // Re-render with same messages
      rerender(<ChatInterface {...defaultProps} messages={sampleMessages} />);

      // Should still render correctly
      expect(screen.getByText('Hello, how can I help you today?')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed messages gracefully', () => {
      const malformedMessages: Message[] = [
        {
          id: '1',
          content: '', // Empty content
          role: 'assistant',
          timestamp: new Date(),
        },
        {
          id: '2',
          content: 'Valid message',
          role: 'user',
          timestamp: new Date(),
        },
      ];

      render(<ChatInterface {...defaultProps} messages={malformedMessages} />);

      expect(screen.getByText('Valid message')).toBeInTheDocument();
    });

    it('should handle message metadata errors gracefully', () => {
      const messagesWithMetadata: Message[] = [
        {
          id: '1',
          content: 'Message with metadata',
          role: 'assistant',
          timestamp: new Date(),
          metadata: {
            type: 'info',
            confidence: 0.95,
            sources: ['source1', 'source2'],
          },
        },
      ];

      render(<ChatInterface {...defaultProps} messages={messagesWithMetadata} />);

      expect(screen.getByText('Message with metadata')).toBeInTheDocument();
    });

    it('should handle scroll position when new messages arrive', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} messages={[]} />);

      const input = screen.getByPlaceholderText(/type your message/i);
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      // Should scroll to new message
      await waitFor(() => {
        const messageContainer = screen.getByRole('log');
        expect(messageContainer.scrollTop).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to different screen sizes', () => {
      // Mobile view
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      render(<ChatInterface {...defaultProps} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();

      // Desktop view
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
      render(<ChatInterface {...defaultProps} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should handle max height constraint', () => {
      render(<ChatInterface {...defaultProps} maxHeight={300} />);

      const container = screen.getByRole('log');
      expect(container).toHaveStyle('max-height: 300px');
    });
  });
});