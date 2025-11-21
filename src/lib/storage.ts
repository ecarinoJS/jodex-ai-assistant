import { Message, UIConfig, VoiceSettings, Alert, StorageData } from '../types';

/**
 * Storage Manager for persisting data
 */
export class StorageManager {
  private storageKey: string;
  private isLocalStorageAvailable: boolean;

  constructor(storageKey = 'jodex-ai-assistant') {
    this.storageKey = storageKey;
    this.isLocalStorageAvailable = this.checkLocalStorageAvailability();
  }

  /**
   * Check if localStorage is available
   */
  private checkLocalStorageAvailability(): boolean {
    try {
      const testKey = '__jodex_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('localStorage is not available:', error);
      return false;
    }
  }

  /**
   * Save data to storage
   */
  save(data: Partial<StorageData>): void {
    if (!this.isLocalStorageAvailable) {
      console.warn('Cannot save to storage: localStorage not available');
      return;
    }

    try {
      const existingData = this.load();
      const updatedData: StorageData = {
        ...existingData,
        ...data,
        lastActivity: new Date().toISOString(),
      };

      localStorage.setItem(this.storageKey, JSON.stringify(updatedData));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  /**
   * Load data from storage
   */
  load(): StorageData {
    if (!this.isLocalStorageAvailable) {
      return this.getDefaultStorageData();
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return this.getDefaultStorageData();
      }

      const data = JSON.parse(stored);

      // Convert timestamp strings back to Date objects
      if (data.messages) {
        data.messages = data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      }

      if (data.alerts) {
        data.alerts = data.alerts.map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp),
          snoozedUntil: alert.snoozedUntil ? new Date(alert.snoozedUntil) : undefined,
        }));
      }

      return { ...this.getDefaultStorageData(), ...data };
    } catch (error) {
      console.error('Failed to load from storage:', error);
      return this.getDefaultStorageData();
    }
  }

  /**
   * Clear all stored data
   */
  clear(): void {
    if (!this.isLocalStorageAvailable) {
      return;
    }

    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * Get default storage data
   */
  private getDefaultStorageData(): StorageData {
    return {
      messages: [],
      settings: {},
      voiceSettings: {},
      alerts: [],
      lastActivity: new Date().toISOString(),
    };
  }

  /**
   * Save messages
   */
  saveMessages(messages: Message[]): void {
    const limitedMessages = messages.slice(-100); // Keep only last 100 messages
    this.save({ messages: limitedMessages });
  }

  /**
   * Load messages
   */
  loadMessages(): Message[] {
    const data = this.load();
    return data.messages || [];
  }

  /**
   * Save settings
   */
  saveSettings(settings: Partial<UIConfig>): void {
    this.save({ settings });
  }

  /**
   * Load settings
   */
  loadSettings(): Partial<UIConfig> {
    const data = this.load();
    return data.settings || {};
  }

  /**
   * Save voice settings
   */
  saveVoiceSettings(settings: Partial<VoiceSettings>): void {
    this.save({ voiceSettings: settings });
  }

  /**
   * Load voice settings
   */
  loadVoiceSettings(): Partial<VoiceSettings> {
    const data = this.load();
    return data.voiceSettings || {};
  }

  /**
   * Save alerts
   */
  saveAlerts(alerts: Alert[]): void {
    // Remove expired alerts
    const validAlerts = alerts.filter(alert => {
      if (alert.dismissed) return false;
      if (alert.snoozedUntil && new Date() > alert.snoozedUntil) return false;
      // Remove alerts older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return alert.timestamp > thirtyDaysAgo;
    });

    this.save({ alerts: validAlerts });
  }

  /**
   * Load alerts
   */
  loadAlerts(): Alert[] {
    const data = this.load();
    return data.alerts || [];
  }

  /**
   * Get storage size
   */
  getStorageSize(): number {
    if (!this.isLocalStorageAvailable) {
      return 0;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? stored.length : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if storage is getting full
   */
  isStorageNearFull(): boolean {
    const size = this.getStorageSize();
    // localStorage typically has 5-10MB limit, warn at 4MB
    return size > 4 * 1024 * 1024; // 4MB
  }
}

/**
 * In-memory storage for fallback
 */
export class MemoryStorage {
  private data: StorageData;

  constructor() {
    this.data = {
      messages: [],
      settings: {},
      voiceSettings: {},
      alerts: [],
      lastActivity: new Date().toISOString(),
    };
  }

  save(data: Partial<StorageData>): void {
    this.data = {
      ...this.data,
      ...data,
      lastActivity: new Date().toISOString(),
    };
  }

  load(): StorageData {
    return { ...this.data };
  }

  clear(): void {
    this.data = {
      messages: [],
      settings: {},
      voiceSettings: {},
      alerts: [],
      lastActivity: new Date().toISOString(),
    };
  }
}

/**
 * Factory function to create appropriate storage manager
 */
export function createStorageManager(storageKey = 'jodex-ai-assistant'): StorageManager | MemoryStorage {
  try {
    // Test localStorage availability
    const testKey = '__jodex_storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return new StorageManager(storageKey);
  } catch (error) {
    console.warn('Falling back to memory storage');
    return new MemoryStorage() as any;
  }
}