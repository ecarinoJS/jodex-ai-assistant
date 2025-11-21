import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, UIConfig } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onCollapse: () => void;
  config: UIConfig;
  showHeader: boolean;
  showFooter: boolean;
  showTimestamps: boolean;
  voiceEnabled: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onCollapse,
  config,
  showHeader,
  showFooter,
  showTimestamps,
  voiceEnabled,
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="jodex-chat-container">
      {/* Header */}
      {showHeader && (
        <div className="jodex-chat-header">
          <div className="flex items-center gap-3">
            {config.logo ? (
              <img src={config.logo} alt="Jodex AI" className="w-6 h-6" />
            ) : (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">JD</span>
              </div>
            )}
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {config.title}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection status indicator */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Online</span>
            </div>

            {/* Collapse button */}
            <button
              onClick={onCollapse}
              className="jodex-btn-icon"
              title="Collapse chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="jodex-chat-messages">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center h-full text-center p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Welcome to Jodex AI Assistant
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
                I'm here to help you with agricultural supply chain management. Ask me about farmers, weather conditions, harvest data, or anything else related to your cacao operations.
              </p>
              {voiceEnabled && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                  💬 You can also use voice input by clicking the microphone button
                </p>
              )}
            </motion.div>
          ) : (
            messages.map((message, index) => (
              <motion.div
                key={message.id}
                className={`jodex-message jodex-message-${message.role}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                {/* Avatar */}
                <div className="jodex-message-avatar">
                  {message.role === 'user' ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Message content */}
                <div className="jodex-message-content">
                  <div className="jodex-message-text">
                    {message.isStreaming ? (
                      <div className="flex items-center gap-2">
                        <span>{message.content}</span>
                        <div className="jodex-typing">
                          <div className="jodex-typing-dot" />
                          <div className="jodex-typing-dot" />
                          <div className="jodex-typing-dot" />
                        </div>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>

                  {showTimestamps && (
                    <div className="jodex-message-timestamp">
                      {formatTimestamp(message.timestamp)}
                    </div>
                  )}

                  {/* Actions */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.actions.map((action, actionIndex) => (
                        <div
                          key={actionIndex}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-md"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {action.type.replace('_', ' ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            className="jodex-message jodex-message-assistant"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="jodex-message-avatar">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="jodex-message-content">
              <div className="jodex-typing">
                <div className="jodex-typing-dot" />
                <div className="jodex-typing-dot" />
                <div className="jodex-typing-dot" />
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  Jodex is thinking...
                </span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer with input */}
      {showFooter && (
        <div className="jodex-chat-input-container">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about farmers, weather, or harvest data..."
                className="jodex-input"
                disabled={isLoading}
                autoComplete="off"
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="jodex-loading" />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="jodex-btn jodex-btn-primary"
              title="Send message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>

          {/* Help text */}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            Press Enter to send • Shift+Enter for new line
          </div>
        </div>
      )}
    </div>
  );
};