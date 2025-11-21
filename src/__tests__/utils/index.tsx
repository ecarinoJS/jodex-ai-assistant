import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { JodexAI } from '../../JodexAI';
import type { JodexAIProps, Message, Alert, Datasets, Action } from '../../types';

// Enhanced test render function with custom providers
export interface TestRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: boolean;
  withJodexAI?: boolean;
  jodexProps?: Partial<JodexAIProps>;
}

interface TestRenderResult {
  container: HTMLElement;
  baseElement: HTMLElement;
  debug: (element?: HTMLElement | DocumentFragment) => void;
  rerender: (ui: React.ReactElement) => void;
  unmount: () => void;
  user: UserEvent;
}

// Mock data generators
export const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  content: 'Test message',
  role: 'user',
  timestamp: new Date(),
  ...overrides,
});

export const createMockAssistantMessage = (content = 'AI response', overrides: Partial<Message> = {}): Message => ({
  id: `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  content,
  role: 'assistant',
  timestamp: new Date(),
  metadata: { type: 'response' },
  ...overrides,
});

export const createMockSystemMessage = (content = 'System notification', overrides: Partial<Message> = {}): Message => ({
  id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  content,
  role: 'system',
  timestamp: new Date(),
  metadata: { type: 'system' },
  ...overrides,
});

export const createMockAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: 'weather',
  title: 'Test Alert',
  message: 'This is a test alert',
  priority: 'medium',
  timestamp: new Date(),
  acknowledged: false,
  dismissed: false,
  ...overrides,
});

export const createMockFarmer = (overrides: any = {}) => ({
  id: `farmer-${Date.now()}`,
  name: 'Test Farmer',
  location: {
    latitude: 7.0731,
    longitude: 125.6128,
    region: 'Davao Region',
    country: 'Philippines',
  },
  farm: {
    size: 2.5,
    sizeUnit: 'hectares',
    crops: ['cacao', 'coconut'],
    establishedYear: 2020,
  },
  contact: {
    phone: '+639123456789',
    email: 'farmer@example.com',
  },
  ...overrides,
});

export const createMockHarvest = (overrides: any = {}) => ({
  id: `harvest-${Date.now()}`,
  farmerId: `farmer-${Date.now()}`,
  date: new Date().toISOString(),
  crop: 'cacao',
  quantity: 500,
  quantityUnit: 'kg',
  quality: 'A',
  price: 150.00,
  priceUnit: 'per kg',
  location: {
    latitude: 7.0731,
    longitude: 125.6128,
  },
  ...overrides,
});

export const createMockWeatherData = (overrides: any = {}) => ({
  location: {
    latitude: 7.0731,
    longitude: 125.6128,
    name: 'Davao City',
  },
  current: {
    temperature: 28,
    humidity: 85,
    windSpeed: 12,
    windDirection: 'NE',
    pressure: 1013,
    visibility: 10,
    uvIndex: 7,
    condition: 'partly_cloudy',
  },
  forecast: Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
    high: 32 + i,
    low: 24 + i,
    condition: ['sunny', 'cloudy', 'rainy'][i % 3],
    precipitation: i % 3 === 2 ? 80 : 20,
    humidity: 80 + i * 2,
  })),
  alerts: [],
  ...overrides,
});

export const createMockDatasets = (overrides: Partial<Datasets> = {}): Datasets => ({
  farmers: Array.from({ length: 5 }, () => createMockFarmer()),
  harvest: Array.from({ length: 10 }, () => createMockHarvest()),
  weather: Array.from({ length: 3 }, (_, i) => createMockWeatherData({
    location: {
      latitude: 7.0731 + i * 0.1,
      longitude: 125.6128 + i * 0.1,
      name: `Location ${i + 1}`,
    }
  })),
  ...overrides,
});

export const createMockAction = (overrides: Partial<Action> = {}): Action => ({
  type: 'update_location',
  data: { latitude: 7.0731, longitude: 125.6128 },
  priority: 'medium',
  timestamp: new Date().toISOString(),
  ...overrides,
});

// OpenAI mock helpers
export const createMockOpenAIResponse = (content = 'AI response', overrides: any = {}) => ({
  choices: [
    {
      message: {
        role: 'assistant' as const,
        content,
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 20,
    completion_tokens: 10,
    total_tokens: 30,
  },
  ...overrides,
});

export const createMockOpenAIStreamChunk = (content: string, isComplete = false) => ({
  choices: [
    {
      delta: {
        content,
      },
      finish_reason: isComplete ? 'stop' : null,
    },
  ],
});

// LiveKit mock helpers
export const createMockLiveKitRoom = (overrides: any = {}) => ({
  name: 'test-room',
  participants: new Map(),
  state: 'connected' as const,
  metadata: '',
  ...overrides,
});

export const createMockLiveKitParticipant = (overrides: any = {}) => ({
  identity: `participant-${Date.now()}`,
  name: 'Test Participant',
  metadata: '',
  permissions: {
    canSubscribe: true,
    canPublish: true,
    canPublishData: true,
  },
  ...overrides,
});

// Fetch mock helpers
export const createMockFetchResponse = (data: any, options: any = {}) => ({
  ok: true,
  status: 200,
  headers: new Map(Object.entries(options.headers || {})),
  json: async () => data,
  text: async () => JSON.stringify(data),
  blob: async () => new Blob([JSON.stringify(data)]),
  arrayBuffer: async () => new ArrayBuffer(JSON.stringify(data).length),
  ...options,
});

export const createMockFetchError = (message: string, status = 500, type = 'network') => {
  const error = new Error(message) as any;
  error.status = status;
  error.type = type;
  return error;
};

// Storage mock helpers
export const createMockStorage = () => {
  const store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(key => delete store[key]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
    _store: store, // Expose for testing
  };
};

// Voice mock helpers
export const createMockMediaStream = (tracks: any[] = []) => {
  const mockTrack = {
    id: 'mock-track',
    kind: 'audio',
    label: 'Mock Audio Track',
    enabled: true,
    muted: false,
    readyState: 'live',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getSettings: vi.fn().mockReturnValue({}),
    getCapabilities: vi.fn().mockReturnValue({}),
    stop: vi.fn(),
    clone: vi.fn().mockImplementation(() => mockTrack),
  };

  return {
    id: 'mock-stream',
    active: true,
    getAudioTracks: vi.fn().mockReturnValue(tracks.length > 0 ? tracks : [mockTrack]),
    getVideoTracks: vi.fn().mockReturnValue([]),
    getTracks: vi.fn().mockReturnValue(tracks.length > 0 ? tracks : [mockTrack]),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    getTracksById: vi.fn().mockReturnValue([]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    clone: vi.fn().mockImplementation(() => createMockMediaStream(tracks)),
  };
};

export const createMockSpeechRecognition = () => ({
  continuous: true,
  interimResults: true,
  lang: 'en-US',
  maxAlternatives: 1,
  serviceURI: '',
  onresult: null as ((event: any) => void) | null,
  onerror: null as ((event: any) => void) | null,
  onend: null as ((event: any) => void) | null,
  onstart: null as ((event: any) => void) | null,
  onnomatch: null as ((event: any) => void) | null,
  onsoundstart: null as ((event: any) => void) | null,
  onsoundend: null as ((event: any) => void) | null,
  onspeechstart: null as ((event: any) => void) | null,
  onspeechend: null as ((event: any) => void) | null,
  onaudioend: null as ((event: any) => void) | null,
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
});

// Custom render function
export const renderWithJodex = async (
  ui: React.ReactElement,
  options: TestRenderOptions = {}
): Promise<TestRenderResult> => {
  const {
    user: withUser = true,
    withJodexAI: withComponent = false,
    jodexProps = {},
    ...renderOptions
  } = options;

  const user = withUser ? userEvent.setup() : null;

  let componentToRender = ui;
  if (withComponent) {
    const defaultProps: JodexAIProps = {
      openaiApiKey: 'test-api-key',
      datasets: createMockDatasets(),
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
      ...jodexProps,
    };

    componentToRender = <JodexAI {...defaultProps} />;
  }

  const renderResult = render(componentToRender, renderOptions);

  return {
    ...renderResult,
    user: user!,
  };
};

// Utility functions for testing
export const waitForAsync = (ms = 0): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const flushPromises = (): Promise<void> =>
  new Promise(resolve => setImmediate(resolve));

export const createMockPerformanceNow = (startTime = 0) => {
  let currentTime = startTime;
  return jest.fn(() => currentTime++);
};

// Browser environment mock helpers
export const mockGeolocation = (overrides: any = {}) => {
  const mockGeolocation = {
    getCurrentPosition: vi.fn().mockImplementation((success, error) => {
      success({
        coords: {
          latitude: 7.0731,
          longitude: 125.6128,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
        ...overrides,
      });
    }),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  };

  Object.defineProperty(global.navigator, 'geolocation', {
    value: mockGeolocation,
    writable: true,
  });

  return mockGeolocation;
};

export const mockMediaDevices = (overrides: any = {}) => {
  const mockMediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue(createMockMediaStream()),
    enumerateDevices: vi.fn().mockResolvedValue([
      {
        deviceId: 'audio-input-1',
        kind: 'audioinput',
        label: 'Mock Microphone',
        groupId: 'group1',
      },
      {
        deviceId: 'audio-output-1',
        kind: 'audiooutput',
        label: 'Mock Speaker',
        groupId: 'group1',
      },
    ]),
    getSupportedConstraints: vi.fn().mockReturnValue({
      width: true,
      height: true,
      sampleRate: true,
      channelCount: true,
    }),
    ...overrides,
  };

  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: mockMediaDevices,
    writable: true,
  });

  return mockMediaDevices;
};

// Test data factories
export class MockDataFactory {
  static createConversation(length: number): Message[] {
    const messages: Message[] = [];
    for (let i = 0; i < length; i++) {
      const isUser = i % 2 === 0;
      messages.push(createMockMessage({
        id: `msg-${i}`,
        content: `Message ${i + 1}`,
        role: isUser ? 'user' : 'assistant',
        timestamp: new Date(Date.now() - (length - i) * 1000),
      }));
    }
    return messages;
  }

  static createAlerts(count: number, types: Alert['type'][] = ['weather', 'system', 'harvest']): Alert[] {
    const alerts: Alert[] = [];
    for (let i = 0; i < count; i++) {
      alerts.push(createMockAlert({
        id: `alert-${i}`,
        type: types[i % types.length],
        title: `Alert ${i + 1}`,
        message: `This is alert number ${i + 1}`,
        priority: ['low', 'medium', 'high'][i % 3] as Alert['priority'],
        timestamp: new Date(Date.now() - i * 60000),
      }));
    }
    return alerts;
  }

  static createFarmerNetwork(size: number) {
    return Array.from({ length: size }, (_, i) => createMockFarmer({
      id: `farmer-${i}`,
      name: `Farmer ${i + 1}`,
      location: {
        latitude: 7.0731 + (i * 0.01),
        longitude: 125.6128 + (i * 0.01),
        region: `Region ${i + 1}`,
        country: 'Philippines',
      },
    }));
  }

  static createHarvestHistory(count: number, farmerId: string) {
    return Array.from({ length: count }, (_, i) => createMockHarvest({
      id: `harvest-${i}`,
      farmerId,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      quantity: 100 + (i * 50),
      quality: ['A', 'B', 'C'][i % 3] as 'A' | 'B' | 'C',
      price: 100 + (i * 10),
    }));
  }
}

// Re-export commonly used testing utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { vi, expect, beforeEach, afterEach, describe, it, test } from 'vitest';