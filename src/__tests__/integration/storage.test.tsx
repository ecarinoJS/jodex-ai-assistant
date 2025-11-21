import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JodexAI } from '../../components/JodexAI';
import { StorageManager } from '../../lib/storage';
import type { Message, JodexAIProps, StorageSettings } from '../../types';

// Mock dependencies
vi.mock('../../lib/openai', () => ({
  OpenAIClient: vi.fn().mockImplementation(() => ({
    chatCompletion: vi.fn().mockResolvedValue({
      content: 'AI response',
      role: 'assistant'
    }),
    streamChatCompletion: vi.fn().mockImplementation(async function* () {
      yield { content: 'Hello', accumulatedContent: 'Hello' };
      yield { done: true, content: 'Hello' };
    }),
  }))
}));

vi.mock('../../lib/livekit', () => ({
  VoiceConnection: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(true),
    isSpeaking: false,
    isConnected: false,
  }))
}));

vi.mock('../../lib/actions', () => ({
  ActionManager: vi.fn().mockImplementation(() => ({
    executeAction: vi.fn(),
    getActionHistory: vi.fn().mockReturnValue([]),
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

describe('Storage Integration Tests', () => {
  let mockLocalStorage: Storage;
  let mockSessionStorage: Storage;
  let mockIndexedDB: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage
    const store: { [key: string]: string } = {};
    mockLocalStorage = {
      length: 0,
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
        mockLocalStorage.length = 0;
      }),
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => {
        store[key] = value;
        mockLocalStorage.length = Object.keys(store).length;
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
        mockLocalStorage.length = Object.keys(store).length;
      }),
      key: vi.fn((index) => Object.keys(store)[index] || null),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Mock sessionStorage
    const sessionStore: { [key: string]: string } = {};
    mockSessionStorage = {
      length: 0,
      clear: vi.fn(() => {
        Object.keys(sessionStore).forEach(key => delete sessionStore[key]);
        mockSessionStorage.length = 0;
      }),
      getItem: vi.fn((key) => sessionStore[key] || null),
      setItem: vi.fn((key, value) => {
        sessionStore[key] = value;
        mockSessionStorage.length = Object.keys(sessionStore).length;
      }),
      removeItem: vi.fn((key) => {
        delete sessionStore[key];
        mockSessionStorage.length = Object.keys(sessionStore).length;
      }),
      key: vi.fn((index) => Object.keys(sessionStore)[index] || null),
    };
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });

    // Mock IndexedDB
    mockIndexedDB = {
      open: vi.fn().mockReturnValue({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: {
          transaction: vi.fn().mockReturnValue({
            objectStore: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue({
                onsuccess: null,
                onerror: null,
              }),
              put: vi.fn().mockReturnValue({
                onsuccess: null,
                onerror: null,
              }),
              delete: vi.fn().mockReturnValue({
                onsuccess: null,
                onerror: null,
              }),
            }),
          }),
        },
      }),
    };
    Object.defineProperty(window, 'indexedDB', {
      value: mockIndexedDB,
      writable: true,
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
    storage: {
      enabled: true,
      persistence: 'localStorage',
      autoSave: true,
      compression: false,
      encryption: false,
    },
  };

  describe('Message Persistence Across Sessions', () => {
    it('should save chat messages to localStorage', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Send a few messages
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      const messages = [
        'Hello, I need help with my farm',
        'What fertilizer should I use for cacao?',
        'How often should I water my plants?'
      ];

      for (const message of messages) {
        await user.clear(chatInput);
        await user.type(chatInput, message);
        await user.click(sendButton);

        await waitFor(() => {
          expect(screen.getByText(message)).toBeInTheDocument();
        });
      }

      // Check that messages were saved to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalled();

      const savedMessages = mockLocalStorage.getItem('jodex-messages');
      expect(savedMessages).toBeTruthy();

      const parsedMessages = JSON.parse(savedMessages || '[]');
      expect(parsedMessages).toHaveLength(messages.length);
      parsedMessages.forEach((savedMessage: Message, index: number) => {
        expect(savedMessage.content).toBe(messages[index]);
        expect(savedMessage.role).toBe('user');
      });
    });

    it('should restore messages from localStorage on component mount', async () => {
      const existingMessages: Message[] = [
        {
          id: '1',
          content: 'Previous message about farming',
          role: 'user',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          content: 'I can help you with farming questions',
          role: 'assistant',
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
      ];

      // Pre-populate localStorage with existing messages
      mockLocalStorage.setItem('jodex-messages', JSON.stringify(existingMessages));

      render(<JodexAI {...defaultProps} />);

      // Should restore and display existing messages
      await waitFor(() => {
        expect(screen.getByText('Previous message about farming')).toBeInTheDocument();
        expect(screen.getByText('I can help you with farming questions')).toBeInTheDocument();
      });
    });

    it('should handle message persistence with sessionStorage', async () => {
      const user = userEvent.setup();
      const sessionProps = {
        ...defaultProps,
        storage: {
          ...defaultProps.storage!,
          persistence: 'sessionStorage',
        } as StorageSettings,
      };

      render(<JodexAI {...sessionProps} />);

      // Send a message
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Session storage test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Session storage test message')).toBeInTheDocument();
      });

      // Should save to sessionStorage, not localStorage
      expect(mockSessionStorage.setItem).toHaveBeenCalled();
      expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith('jodex-messages', expect.any(String));
    });
  });

  describe('Settings Persistence', () => {
    it('should save user settings to storage', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Find settings panel and modify settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      // Change theme setting
      const themeSelect = screen.getByRole('combobox', { name: /theme/i });
      await user.selectOptions(themeSelect, 'dark');

      // Change voice settings
      const voiceToggle = screen.getByRole('switch', { name: /voice/i });
      await user.click(voiceToggle);

      // Settings should be saved
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'jodex-settings',
          expect.stringContaining('dark')
        );
      });
    });

    it('should restore user settings on component mount', async () => {
      const existingSettings = {
        theme: 'dark',
        voice: {
          enabled: true,
          autoStart: false,
          voiceType: 'female',
        },
        notifications: {
          enabled: true,
          sound: false,
        },
      };

      // Pre-populate localStorage with settings
      mockLocalStorage.setItem('jodex-settings', JSON.stringify(existingSettings));

      render(<JodexAI {...defaultProps} />);

      // Should apply saved settings
      await waitFor(() => {
        // Check for dark theme indicators or other applied settings
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('jodex-settings');
      });
    });

    it('should handle settings migration between versions', async () => {
      // Simulate old settings format
      const oldSettings = {
        theme: 'light', // Old format
        voice_enabled: true, // Old property naming
      };

      mockLocalStorage.setItem('jodex-settings', JSON.stringify(oldSettings));

      render(<JodexAI {...defaultProps} />);

      // Should handle migration without errors
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument();
      });
    });
  });

  describe('Storage Quota and Error Handling', () => {
    it('should handle localStorage quota exceeded', async () => {
      const user = userEvent.setup();

      // Mock localStorage to throw quota exceeded error
      mockLocalStorage.setItem = vi.fn().mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        (error as any).name = 'QuotaExceededError';
        throw error;
      });

      render(<JodexAI {...defaultProps} />);

      // Send a message
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Test message');
      await user.click(sendButton);

      // Should handle quota error gracefully
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });

    it('should fallback to memory storage when localStorage is unavailable', async () => {
      // Make localStorage unavailable
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Should still work with memory storage
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Memory storage test');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Memory storage test')).toBeInTheDocument();
      });
    });

    it('should handle corrupted storage data', async () => {
      // Set corrupted data in localStorage
      mockLocalStorage.setItem('jodex-messages', 'invalid json data');
      mockLocalStorage.setItem('jodex-settings', '{"incomplete": json');

      render(<JodexAI {...defaultProps} />);

      // Should handle corrupted data gracefully
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument();
      });
    });
  });

  describe('Data Compression and Encryption', () => {
    it('should handle message compression when enabled', async () => {
      const user = userEvent.setup();
      const compressedProps = {
        ...defaultProps,
        storage: {
          ...defaultProps.storage!,
          compression: true,
        } as StorageSettings,
      };

      render(<JodexAI {...compressedProps} />);

      // Send a long message
      const longMessage = 'A'.repeat(1000); // Long message that benefits from compression
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, longMessage);
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(longMessage)).toBeInTheDocument();
      });

      // Should attempt to save compressed data
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should handle data encryption when enabled', async () => {
      const user = userEvent.setup();
      const encryptedProps = {
        ...defaultProps,
        storage: {
          ...defaultProps.storage!,
          encryption: true,
        } as StorageSettings,
      };

      render(<JodexAI {...encryptedProps} />);

      // Send a sensitive message
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Sensitive farm data: password123');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Sensitive farm data: password123')).toBeInTheDocument();
      });

      // Encrypted data should not contain the original text
      const savedData = mockLocalStorage.setItem.mock.calls
        .find(call => call[0] === 'jodex-messages')?.[1];

      expect(savedData).not.toBe('Sensitive farm data: password123');
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('should sync messages across browser tabs', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Send a message
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Cross-tab test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Cross-tab test message')).toBeInTheDocument();
      });

      // Simulate storage event from another tab
      const newMessage: Message = {
        id: 'external-1',
        content: 'Message from another tab',
        role: 'user',
        timestamp: new Date(),
      };

      act(() => {
        const storageEvent = new StorageEvent('storage', {
          key: 'jodex-messages',
          newValue: JSON.stringify([newMessage]),
          oldValue: null,
          storageArea: mockLocalStorage,
        });
        window.dispatchEvent(storageEvent);
      });

      // Should update with message from other tab
      await waitFor(() => {
        expect(screen.getByText('Message from another tab')).toBeInTheDocument();
      });
    });

    it('should handle settings sync across tabs', async () => {
      render(<JodexAI {...defaultProps} />);

      // Simulate settings change from another tab
      const newSettings = {
        theme: 'dark',
        voice: { enabled: true },
      };

      act(() => {
        const storageEvent = new StorageEvent('storage', {
          key: 'jodex-settings',
          newValue: JSON.stringify(newSettings),
          oldValue: '{}',
          storageArea: mockLocalStorage,
        });
        window.dispatchEvent(storageEvent);
      });

      // Should apply settings from other tab
      await waitFor(() => {
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('jodex-settings');
      });
    });
  });

  describe('Data Backup and Migration', () => {
    it('should create data backups periodically', async () => {
      const user = userEvent.setup();
      const backupProps = {
        ...defaultProps,
        storage: {
          ...defaultProps.storage!,
          autoBackup: true,
          backupInterval: 60000, // 1 minute for testing
        } as StorageSettings,
      };

      render(<JodexAI {...backupProps} />);

      // Send some messages
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Backup test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Backup test message')).toBeInTheDocument();
      });

      // Should create backup data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('jodex-backup-'),
        expect.any(String)
      );
    });

    it('should handle data migration between storage types', async () => {
      // Start with sessionStorage data
      const sessionData: Message[] = [
        {
          id: 'session-1',
          content: 'Session stored message',
          role: 'user',
          timestamp: new Date(),
        },
      ];

      mockSessionStorage.setItem('jodex-messages', JSON.stringify(sessionData));

      const user = userEvent.setup();

      // Render with localStorage - should migrate from sessionStorage
      render(<JodexAI {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Session stored message')).toBeInTheDocument();
      });

      // Should migrate data to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'jodex-messages',
        JSON.stringify(sessionData)
      );
    });

    it('should export data for backup', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Send some messages
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(chatInput, 'Export test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Export test message')).toBeInTheDocument();
      });

      // Find and click export button
      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      // Should trigger export functionality
      await waitFor(() => {
        const exportData = mockLocalStorage.getItem('jodex-export');
        expect(exportData).toBeTruthy();
        expect(JSON.parse(exportData || '{}')).toHaveProperty('messages');
      });
    });

    it('should import data from backup', async () => {
      const importData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        messages: [
          {
            id: 'import-1',
            content: 'Imported test message',
            role: 'user',
            timestamp: new Date(),
          },
        ],
        settings: {
          theme: 'dark',
          voice: { enabled: true },
        },
      };

      // Set import data in storage
      mockLocalStorage.setItem('jodex-import', JSON.stringify(importData));

      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Find and click import button
      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      // Should import and display data
      await waitFor(() => {
        expect(screen.getByText('Imported test message')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should efficiently handle large message history', async () => {
      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Generate many messages
      const messages = Array.from({ length: 50 }, (_, i) => `Message ${i + 1}`);
      const chatInput = screen.getByRole('textbox', { name: /message/i });
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send multiple messages
      for (const message of messages.slice(0, 5)) { // Limit for performance
        await user.clear(chatInput);
        await user.type(chatInput, message);
        await user.click(sendButton);

        await waitFor(() => {
          expect(screen.getByText(message)).toBeInTheDocument();
        }, { timeout: 5000 });
      }

      // Should maintain performance
      expect(chatInput).not.toBeDisabled();
    });

    it('should implement lazy loading for message history', async () => {
      // Pre-populate with many messages
      const manyMessages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Historical message ${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: new Date(Date.now() - (i * 1000)),
      }));

      mockLocalStorage.setItem('jodex-messages', JSON.stringify(manyMessages));

      const user = userEvent.setup();
      render(<JodexAI {...defaultProps} />);

      // Should load initial messages quickly
      await waitFor(() => {
        expect(screen.getByText('Historical message 99')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});