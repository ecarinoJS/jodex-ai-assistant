import { vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock Web APIs
Object.defineProperty(global, 'WebSocket', {
  value: vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1, // WebSocket.OPEN
  })),
  writable: true,
});

// Mock fetch
global.fetch = vi.fn();

// Enhanced LiveKit mocks
const mockRoom = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  off: vi.fn(),
  localParticipant: {
    publishTrack: vi.fn().mockResolvedValue({ track: { sid: 'test-track' } }),
    unpublishTrack: vi.fn().mockResolvedValue(undefined),
    setCameraEnabled: vi.fn(),
    setMicrophoneEnabled: vi.fn(),
  },
  participants: new Map(),
  state: 'connected',
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue({
        getAudioTracks: vi.fn().mockReturnValue([{}]),
        getVideoTracks: vi.fn().mockReturnValue([]),
      }),
    },
  },
  writable: true,
});

// Mock AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  createMediaStreamSource: vi.fn().mockReturnValue({
    connect: vi.fn(),
  }),
  createAnalyser: vi.fn().mockReturnValue({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn(),
  }),
  close: vi.fn().mockResolvedValue(undefined),
})) as any;

// Mock speech recognition
const mockSpeechRecognition = vi.fn().mockImplementation(() => ({
  continuous: true,
  interimResults: true,
  lang: 'en-US',
  onresult: vi.fn(),
  onerror: vi.fn(),
  onend: vi.fn(),
  onstart: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
}));

Object.defineProperty(global, 'SpeechRecognition', {
  value: mockSpeechRecognition,
  writable: true,
});

Object.defineProperty(global, 'webkitSpeechRecognition', {
  value: mockSpeechRecognition,
  writable: true,
});

// Mock speech synthesis
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn().mockReturnValue([]),
    pending: false,
    speaking: false,
    paused: false,
  },
  writable: true,
});

global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  lang: 'en-US',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  voice: null,
  onend: vi.fn(),
  onerror: vi.fn(),
  onstart: vi.fn(),
  onmark: vi.fn(),
  onboundary: vi.fn(),
  onpause: vi.fn(),
  onresume: vi.fn(),
})) as any;

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock MutationObserver
global.MutationObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn().mockReturnValue([]),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = vi.fn();

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-1234-5678-9012'),
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
  writable: true,
});

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();

  // Reset localStorage
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();

  // Reset sessionStorage
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();

  // Reset fetch mock
  (global.fetch as any).mockClear();

  // Reset WebSocket mock
  (global.WebSocket as any).mockClear();
});

afterEach(() => {
  // Restore console methods
  Object.assign(console, originalConsole);

  // Clear any pending timers
  vi.clearAllTimers();
});

// Test utilities
export const createMockRoom = (overrides = {}) => ({
  name: 'test-room',
  participants: new Set(),
  createdAt: new Date(),
  ...overrides,
});

export const createMockParticipant = (overrides = {}) => ({
  identity: 'test-user',
  name: 'Test User',
  metadata: '',
  ...overrides,
});

export const createMockMessage = (overrides = {}) => ({
  id: 'test-message-1',
  content: 'Test message',
  role: 'user',
  timestamp: new Date(),
  ...overrides,
});

export const createMockAction = (overrides = {}) => ({
  type: 'show_weather_alerts',
  data: { severity: 'high' },
  priority: 'medium' as const,
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const createMockAlert = (overrides = {}) => ({
  id: 'test-alert-1',
  type: 'weather' as const,
  title: 'Weather Alert',
  message: 'Heavy rain expected',
  priority: 'high' as const,
  timestamp: new Date(),
  acknowledged: false,
  dismissed: false,
  ...overrides,
});

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

export const createMockFetchResponse = (data: any, options: any = {}) => ({
  ok: true,
  status: 200,
  headers: new Map(Object.entries(options.headers || {})),
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  ...options,
});

export const createMockError = (message: string, status = 500, type = 'unknown') => {
  const error = new Error(message) as any;
  error.status = status;
  error.type = type;
  return error;
};