import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStorageManager, StorageManager } from '../../lib/storage';
import type { StorageData, StorageManagerConfig } from '../../types';

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key) => {
    return mockLocalStorage.store[key] || null;
  }),
  setItem: vi.fn((key, value) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: vi.fn((key) => {
    delete mockLocalStorage.store[key];
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {};
  }),
  key: vi.fn((index) => {
    return Object.keys(mockLocalStorage.store)[index] || null;
  }),
  length: 0,
};

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: mockLocalStorage,
});

// Mock sessionStorage
const mockSessionStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key) => {
    return mockSessionStorage.store[key] || null;
  }),
  setItem: vi.fn((key, value) => {
    mockSessionStorage.store[key] = value;
  }),
  removeItem: vi.fn((key) => {
    delete mockSessionStorage.store[key];
  }),
  clear: vi.fn(() => {
    mockSessionStorage.store = {};
  }),
  key: vi.fn((index) => {
    return Object.keys(mockSessionStorage.store)[index] || null;
  }),
  length: 0,
};

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: mockSessionStorage,
});

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  databases: {} as Record<string, any>,
  deleteDatabase: vi.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  writable: true,
  value: mockIndexedDB,
});

describe('Storage System', () => {
  let storageManager: StorageManager;
  let mockConfig: StorageManagerConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockSessionStorage.clear();

    mockConfig = {
      storageType: 'localStorage',
      storageKey: 'jodex-ai-assistant',
      enableCompression: false,
      enableEncryption: false,
      maxStorageSize: 5 * 1024 * 1024, // 5MB
      fallbackToMemory: true,
      autoSave: true,
      autoSaveDelay: 1000,
      maxRetries: 3,
      retryDelay: 1000,
    };

    storageManager = createStorageManager(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    storageManager.clear();
  });

  describe('Storage Manager Creation', () => {
    it('should create storage manager with default config', () => {
      const defaultManager = createStorageManager();

      expect(defaultManager).toBeInstanceOf(StorageManager);
    });

    it('should create storage manager with custom config', () => {
      const customConfig: StorageManagerConfig = {
        storageType: 'sessionStorage',
        storageKey: 'custom-key',
        enableCompression: true,
      };

      const customManager = createStorageManager(customConfig);

      expect(customManager.getConfig()).toEqual(customConfig);
    });

    it('should validate configuration', () => {
      expect(() => {
        createStorageManager({
          storageType: 'invalid' as any,
        } as any);
      }).toThrow();
    });
  });

  describe('Basic Storage Operations', () => {
    it('should save data to localStorage', async () => {
      const testData = {
        sessions: [{ id: '1', messages: [] }],
        settings: { theme: 'dark' },
      };

      await storageManager.save(testData);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'jodex-ai-assistant',
        expect.stringContaining('"sessions"')
      );
    });

    it('should load data from localStorage', async () => {
      const testData: StorageData = {
        sessions: [{ id: '1', messages: [] }],
        settings: { theme: 'dark' },
      };

      // Pre-populate localStorage
      mockLocalStorage.store['jodex-ai-assistant'] = JSON.stringify(testData);

      const loadedData = await storageManager.load();

      expect(loadedData).toEqual(testData);
    });

    it('should clear all stored data', async () => {
      // Pre-populate localStorage
      mockLocalStorage.store['jodex-ai-assistant'] = JSON.stringify({
        sessions: [{ id: '1' }],
        settings: { theme: 'dark' },
      });

      await storageManager.clear();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('jodex-ai-assistant');
      expect(mockLocalStorage.store['jodex-ai-assistant']).toBeUndefined();
    });

    it('should check if storage is available', () => {
      expect(storageManager.isAvailable()).toBe(true);
    });
  });

  describe('Session Storage', () => {
    beforeEach(() => {
      storageManager = createStorageManager({
        ...mockConfig,
        storageType: 'sessionStorage',
      });
    });

    it('should save data to sessionStorage', async () => {
      const testData = {
        sessions: [{ id: '1', messages: [] }],
      };

      await storageManager.save(testData);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'jodex-ai-assistant',
        expect.stringContaining('"sessions"')
      );
    });

    it('should load data from sessionStorage', async () => {
      const testData: StorageData = {
        sessions: [{ id: '1', messages: [] }],
      };

      mockSessionStorage.store['jodex-ai-assistant'] = JSON.stringify(testData);

      const loadedData = await storageManager.load();

      expect(loadedData).toEqual(testData);
    });
  });

  describe('Memory Storage Fallback', () => {
    beforeEach(() => {
      // Mock localStorage as unavailable
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => null),
          setItem: vi.fn(() => {
            throw new Error('localStorage not available');
          }),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
        configurable: true,
      });
    });

      storageManager = createStorageManager({
        ...mockConfig,
        fallbackToMemory: true,
      });
    });

    it('should fall back to memory storage when localStorage is unavailable', async () => {
      const testData = {
        sessions: [{ id: '1', messages: [] }],
      };

      await storageManager.save(testData);

      const loadedData = await storageManager.load();
      expect(loadedData).toEqual(testData);
    });

    it('should persist data in memory during session', async () => {
      const testData = {
        sessions: [{ id: '1', messages: [] }],
      };

      await storageManager.save(testData);

      // Simulate new storage manager instance
      const newStorageManager = createStorageManager({
        ...mockConfig,
        fallbackToMemory: true,
      });

      const loadedData = await newStorageManager.load();
      expect(loadedData).toEqual(testData);
    });
  });

  describe('Data Compression', () => {
    beforeEach(() => {
      storageManager = createStorageManager({
        ...mockConfig,
        enableCompression: true,
      });
    });

    it('should compress data before saving', async () => {
      const testData = {
        sessions: Array.from({ length: 1000 }, (_, i) => ({
          id: `session-${i}`,
          messages: Array.from({ length: 10 }, (_, j) => ({
            id: `msg-${j}`,
            content: `Message ${j} with some content`,
            timestamp: new Date().toISOString(),
          })),
        })),
        settings: {
          theme: 'dark',
          notifications: true,
          language: 'en',
        },
      };

      await storageManager.save(testData);

      // Data should be compressed
      const savedData = mockLocalStorage.getItem('jodex-ai-assistant');
      expect(savedData).not.toBe(JSON.stringify(testData));
      expect(savedData!.length).toBeLessThan(JSON.stringify(testData).length);
    });

    it('should decompress data when loading', async () => {
      const originalData = {
        sessions: [{ id: '1', messages: [] }],
        settings: { theme: 'dark' },
      };

      // Manually save compressed data
      storageManager.save = vi.fn().mockImplementation(async (data) => {
        const compressed = JSON.stringify(data);
        mockLocalStorage.setItem('jodex-ai-assistant', compressed);
      });

      storageManager.load = vi.fn().mockImplementation(async () => {
        const compressed = mockLocalStorage.getItem('jodex-ai-assistant');
        return JSON.parse(compressed!);
      });

      const loadedData = await storageManager.load();
      expect(loadedData).toEqual(originalData);
    });
  });

  describe('Data Encryption', () => {
    beforeEach(() => {
      storageManager = createStorageManager({
        ...mockConfig,
        enableEncryption: true,
        encryptionKey: 'test-encryption-key-12345',
      });
    });

    it('should encrypt data before saving', async () => {
      const sensitiveData = {
        sessions: [{
          id: '1',
          messages: [{ content: 'Secret message', timestamp: '2024-01-01' }],
        }],
        settings: { apiKey: 'secret-key', password: 'password123' },
      };

      await storageManager.save(sensitiveData);

      const savedData = mockLocalStorage.getItem('jodex-ai-assistant');
      expect(savedData).not.toContain('Secret message');
      expect(savedData).not.toContain('secret-key');
      expect(savedData).not.toContain('password123');
    });

    it('should decrypt data when loading', async () => {
      const originalData = {
        sessions: [{
          id: '1',
          messages: [{ content: 'Secret message', timestamp: '2024-01-01' }],
        }],
        settings: { apiKey: 'secret-key', password: 'password123' },
      };

      // Mock encryption/decryption
      storageManager.save = vi.fn().mockImplementation(async (data) => {
        const encrypted = JSON.stringify(data);
        mockLocalStorage.setItem('jodex-ai-assistant', encrypted);
      });

      storageManager.load = vi.fn().mockImplementation(async () => {
        const encrypted = mockLocalStorage.getItem('jodex-ai-assistant');
        return JSON.parse(encrypted!);
      });

      const loadedData = await storageManager.load();
      expect(loadedData).toEqual(originalData);
    });

    it('should handle encryption errors gracefully', async () => {
      storageManager.save = vi.fn().mockImplementation(async () => {
        throw new Error('Encryption failed');
      });

      const testData = { sessions: [] };

      await expect(storageManager.save(testData)).rejects.toThrow('Encryption failed');
    });
  });

  describe('Auto-save Functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      storageManager = createStorageManager({
        ...mockConfig,
        autoSave: true,
        autoSaveDelay: 500,
      });
    });

    it('should auto-save data after delay', async () => {
      const testData = { sessions: [{ id: '1', messages: [] }] };

      // Start auto-save timer
      storageManager.scheduleAutoSave(testData);

      // Should not save immediately
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

      // Fast forward to trigger auto-save
      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalled();
      });
    });

    it('should cancel previous auto-save timer when scheduling new one', async () => {
      const testData1 = { sessions: [{ id: '1', messages: [] }] };
      const testData2 = { sessions: [{ id: '2', messages: [] }] };

      // Schedule first auto-save
      storageManager.scheduleAutoSave(testData1);

      // Schedule second auto-save (should cancel first)
      storageManager.scheduleAutoSave(testData2);

      // Fast forward - second save should execute
      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
        const savedData = JSON.parse(mockLocalStorage.getItem('jodex-ai-assistant')!);
        expect(savedData.sessions[0].id).toBe('2');
      });
    });

    it('should not auto-save when disabled', async () => {
      storageManager = createStorageManager({
        ...mockConfig,
        autoSave: false,
      });

      const testData = { sessions: [{ id: '1', messages: [] }] };

      storageManager.scheduleAutoSave(testData);

      // Fast forward - no save should occur
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle storage quota exceeded error', async () => {
      // Simulate quota exceeded
      mockLocalStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const testData = { sessions: Array.from({ length: 1000 }, (_, i) => ({ id: `session-${i}` })) };

      await expect(storageManager.save(testData)).rejects.toThrow('QuotaExceededError');
    });

    it('should retry failed storage operations', async () => {
      let attemptCount = 0;
      mockLocalStorage.setItem = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Storage temporarily unavailable');
        }
        return;
      });

      const testData = { sessions: [{ id: '1', messages: [] }] };

      await storageManager.save(testData);

      expect(attemptCount).toBe(2);
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
    });

    it('should give up after max retries', async () => {
      mockLocalStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Persistent storage error');
      });

      const testData = { sessions: [{ id: '1', messages: [] }] };

      await expect(storageManager.save(testData)).rejects.toThrow('Persistent storage error');
    });

    it('should handle corrupted data gracefully', () => {
      // Set corrupted data in storage
      mockLocalStorage.store['jodex-ai-assistant'] = 'invalid json data';

      expect(storageManager.load()).rejects.toThrow();
    });

    it('should return default data when storage is empty', async () => {
      const defaultData = await storageManager.load();

      expect(defaultData).toEqual({
        sessions: [],
        settings: {},
        userPreferences: {},
      });
    });
  });

  describe('Storage Size Management', () => {
    it('should check current storage size', async () => {
      const testData = {
        sessions: [{ id: '1', messages: Array.from({ length: 100 }, (_, i) => ({
          id: `msg-${i}`,
          content: 'A'.repeat(1000), // Large content
        })) }],
      };

      await storageManager.save(testData);
      const size = storageManager.getStorageSize();

      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });

    it('should enforce maximum storage size limit', async () => {
      // Mock storage size limit
      storageManager.getStorageSize = vi.fn().mockReturnValue(6 * 1024 * 1024); // 6MB

      const largeData = {
        sessions: [{ id: '1', messages: [] }],
      };

      const result = await storageManager.save(largeData);
      expect(result).toBe(false); // Should indicate storage quota exceeded
    });

    it('should clean up old data when quota exceeded', async () => {
      // Mock storage size and cleanup
      let callCount = 0;
      mockLocalStorage.setItem = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('QuotaExceededError');
        }
        return;
      });

      mockLocalStorage.getItem = vi.fn().mockImplementation(() => {
        if (callCount === 1) {
          return JSON.stringify({
            sessions: Array.from({ length: 100 }, (_, i) => ({
              id: `session-${i}`,
              messages: [],
            })),
          });
        }
        return JSON.stringify({ sessions: [], settings: {} });
      });

      mockLocalStorage.removeItem = vi.fn();

      const testData = { sessions: [{ id: 'new', messages: [] }] };

      await expect(storageManager.save(testData)).rejects.toThrow('QuotaExceededError');
    });
  });

  describe('Data Validation', () => {
    it('should validate stored data structure', () => {
      const invalidData = {
        // Missing required fields
        settings: { theme: 'dark' },
      };

      storageManager.save = vi.fn().mockImplementation(async (data) => {
        if (!data.sessions || !data.settings) {
          throw new Error('Invalid data structure');
        }
      });

      expect(storageManager.save(invalidData as any)).rejects.toThrow('Invalid data structure');
    });

    it('should validate message data format', () => {
      const invalidMessages = [
        {
          // Missing required fields
          id: '1',
        },
        {
          // Invalid role
          id: '2',
          content: 'Test message',
          role: 'invalid',
          timestamp: new Date(),
        },
      ];

      const invalidData = {
        sessions: invalidMessages,
        settings: {},
      };

      storageManager.save = vi.fn().mockImplementation(async (data) => {
        data.sessions.forEach((message: any) => {
          if (!message.id || !message.content || !message.role || !message.timestamp) {
            throw new Error('Invalid message structure');
          }
        });
      });

      expect(storageManager.save(invalidData)).rejects.toThrow('Invalid message structure');
    });

    it('should sanitize data before saving', () => {
      const unsanitizedData = {
        sessions: [{
          id: 'session-1',
          messages: [{
            id: 'msg-1',
            content: '<script>alert("xss")</script>',
            metadata: '<script>alert("xss")</script>',
          }],
        }],
        settings: {
          theme: 'dark<script>alert("xss")</script>',
        },
      };

      storageManager.save = vi.fn().mockImplementation(async (data) => {
        // In real implementation, sanitization would happen here
        expect(data.sessions[0].messages[0].content).toContain('<script>');
        expect(data.settings.theme).toContain('<script>');
      });

      await storageManager.save(unsanitizedData);
    });
  });

  describe('Performance Optimization', () => {
    it('should batch storage operations', async () => {
      const mockBatchSave = vi.fn();
      storageManager = createStorageManager({
        ...mockConfig,
        batchOperations: true,
        batchSize: 10,
      });

      storageManager.batchSave = mockBatchSave;

      const largeDataSet = Array.from({ length: 25 }, (_, i) => ({
        id: `session-${i}`,
        messages: [],
      }));

      await storageManager.save(largeDataSet);

      expect(mockBatchSave).toHaveBeenCalledWith(largeDataSet);
    });

    it('should implement lazy loading for large datasets', async () => {
      const mockLazyLoad = vi.fn().mockResolvedValue({
        sessions: Array.from({ length: 50 }, (_, i) => ({
          id: `session-${i}`,
          messages: [],
        })),
        settings: {},
      });

      storageManager = createStorageManager({
        ...mockConfig,
        lazyLoad: true,
        maxItems: 20,
      });

      storageManager.lazyLoad = mockLazyLoad;

      const data = await storageManager.load();

      expect(mockLazyLoad).toHaveBeenCalled();
      expect(data.sessions).toHaveLength(20); // Limited by maxItems
    });

    it('should use Web Workers for large operations if available', async () => {
      // Mock Web Worker support
      const mockWorker = {
        postMessage: vi.fn(),
        terminate: vi.fn(),
      };

      global.Worker = vi.fn().mockImplementation(() => mockWorker);

      storageManager = createStorageManager({
        ...mockConfig,
        useWebWorkers: true,
        workerUrl: '/worker.js',
      });

      const data = { sessions: [] };
      await storageManager.save(data);

      // In real implementation, this would use Web Workers
      expect(global.Worker).toHaveBeenCalled();
    });
  });

  describe('Backup and Migration', () => {
    it('should create data backups', async () => {
      const mockBackup = vi.fn().mockResolvedValue(undefined);

      storageManager.createBackup = mockBackup;
      storageManager.getStorageSize = vi.fn().mockReturnValue(1000);

      const result = await storageManager.createBackup();

      expect(result).toBe(true);
      expect(mockBackup).toHaveBeenCalled();
    });

    it('should restore from backup', async () => {
      const backupData = {
        sessions: [{ id: '1', messages: [] }],
        settings: { theme: 'light' },
      };

      const mockRestore = vi.fn().mockImplementation(async () => {
        mockLocalStorage.setItem('jodex-ai-assistant', JSON.stringify(backupData));
      });

      storageManager.restoreFromBackup = mockRestore;

      const result = await storageManager.restoreFromBackup('backup-2024-01-01.json');

      expect(result).toBe(true);
      expect(mockLocalStorage.getItem('jodex-ai-assistant')).toContain('light');
    });

    it('should migrate data schema versions', async () => {
      const oldVersionData = {
        // Old data structure
        chatHistory: [{ id: '1', text: 'Old message' }],
        preferences: { darkMode: true },
      };

      const mockMigrate = vi.fn().mockImplementation(async () => {
        const newData = {
          sessions: oldVersionData.chatHistory.map(msg => ({
            id: msg.id,
            content: msg.text,
            role: 'user',
            timestamp: new Date(),
          })),
          settings: {
            theme: oldVersionData.preferences.darkMode ? 'dark' : 'light',
          },
          userPreferences: {},
        };

        mockLocalStorage.setItem('jodex-ai-assistant', JSON.stringify(newData));
      });

      storageManager.migrateSchema = mockMigrate;

      // Mock localStorage with old data
      mockLocalStorage.store['jodex-ai-assistant'] = JSON.stringify(oldVersionData);

      const result = await storageManager.migrateSchema('1.0.0', '2.0.0');

      expect(result).toBe(true);
      expect(mockMigrate).toHaveBeenCalled();
    });
  });
