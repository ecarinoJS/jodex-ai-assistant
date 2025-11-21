import { vi } from 'vitest';

// OpenAI API Mocks
export const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
};

// OpenAI Constructor Mock
export const mockOpenAIConstructor = vi.fn(() => mockOpenAI);

// LiveKit Room Mock
export const mockRoom = {
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

// LiveKit Room Constructor Mock
export const mockRoomConstructor = vi.fn(() => mockRoom);

// LiveKit Client Mock
export const mockLiveKitClient = {
  connect: vi.fn().mockResolvedValue(mockRoom),
  createLocalTracks: vi.fn().mockResolvedValue([]),
};

// Action Manager Mock
export const mockActionManager = {
  executeAction: vi.fn().mockResolvedValue({ success: true }),
  getActionHistory: vi.fn().mockReturnValue([]),
  addAction: vi.fn(),
  clearActions: vi.fn(),
  getStats: vi.fn().mockReturnValue({
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
  }),
};

// Action Manager Constructor Mock
export const mockActionManagerConstructor = vi.fn(() => mockActionManager);

// Storage Manager Mock
export const mockStorageManager = {
  saveMessage: vi.fn().mockResolvedValue(true),
  getMessages: vi.fn().mockResolvedValue([]),
  saveSettings: vi.fn().mockResolvedValue(true),
  getSettings: vi.fn().mockResolvedValue({}),
  clear: vi.fn().mockResolvedValue(true),
  exportData: vi.fn().mockResolvedValue({}),
  importData: vi.fn().mockResolvedValue(true),
  getStats: vi.fn().mockReturnValue({
    storageUsed: 1024,
    storageQuota: 5242880,
    messageCount: 10,
  }),
};

// Storage Manager Constructor Mock
export const mockStorageManagerConstructor = vi.fn(() => mockStorageManager);

// Zustand Store Mock
export const mockZustandStore = {
  messages: [],
  addMessage: vi.fn(),
  updateMessage: vi.fn(),
  deleteMessage: vi.fn(),
  clearMessages: vi.fn(),
  settings: {
    theme: 'light',
    voice: { enabled: true },
    notifications: { enabled: true },
  },
  updateSettings: vi.fn(),
  alerts: [],
  addAlert: vi.fn(),
  acknowledgeAlert: vi.fn(),
  dismissAlert: vi.fn(),
  clearAlerts: vi.fn(),
  voice: {
    isConnected: false,
    isRecording: false,
    isSpeaking: false,
    transcript: [],
  },
  setVoiceConnected: vi.fn(),
  setVoiceRecording: vi.fn(),
  setVoiceSpeaking: vi.fn(),
  addTranscript: vi.fn(),
  clearTranscript: vi.fn(),
};

// Zustand Create Mock
export const mockZustandCreate = vi.fn((createState) => {
  const state = typeof createState === 'function' ? createState() : {};
  return {
    ...mockZustandStore,
    ...state,
    setState: vi.fn((newState) => {
      if (typeof newState === 'function') {
        Object.assign(state, newState(state));
      } else {
        Object.assign(state, newState);
      }
    }),
    getState: vi.fn(() => state),
    subscribe: vi.fn(),
    destroy: vi.fn(),
  };
});

// Mock factory functions
export const createMockStreamResponse = function* (chunks: string[]) {
  for (const chunk of chunks) {
    yield { choices: [{ delta: { content: chunk } }] };
  }
  yield { choices: [{ delta: {} }], finish_reason: 'stop' };
};

export const createMockChatResponse = (content: string, actions: any[] = []) => ({
  choices: [{
    message: {
      role: 'assistant' as const,
      content,
    },
  }],
  usage: {
    prompt_tokens: 20,
    completion_tokens: 10,
    total_tokens: 30,
  },
  actions,
});

// WebRTC Mocks
export const mockRTCPeerConnection = {
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
  createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  addIceCandidate: vi.fn().mockResolvedValue(undefined),
  addStream: vi.fn(),
  removeStream: vi.fn(),
  close: vi.fn(),
  createDataChannel: vi.fn().mockReturnValue({
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 'open',
  }),
  connectionState: 'new',
  iceConnectionState: 'new',
  iceGatheringState: 'new',
  signalingState: 'stable',
};

// MediaRecorder Mock
export const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  requestData: vi.fn(),
  stream: null,
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
  onerror: null,
  onpause: null,
  onresume: vi.fn(),
  onstart: vi.fn(),
};

export const createMockMediaRecorder = vi.fn(() => mockMediaRecorder);

// Web Audio API Mocks
export const mockAudioContext = {
  createMediaStreamSource: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
  createAnalyser: vi.fn().mockReturnValue({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn(),
    getFloatFrequencyData: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
  createScriptProcessor: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null,
  }),
  createGain: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 },
  }),
  close: vi.fn().mockResolvedValue(undefined),
  sampleRate: 48000,
  state: 'running',
  currentTime: 0,
};

// Speech Recognition Mock
export const mockSpeechRecognition = {
  continuous: true,
  interimResults: true,
  lang: 'en-US',
  maxAlternatives: 1,
  serviceURI: '',
  onresult: null,
  onerror: null,
  onend: null,
  onstart: null,
  onnomatch: null,
  onsoundstart: null,
  onsoundend: null,
  onspeechstart: null,
  onspeechend: null,
  onaudioend: null,
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
};

// Speech Synthesis Mock
export const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn().mockReturnValue([
    {
      name: 'Alex',
      lang: 'en-US',
      voiceURI: 'alex',
      localService: true,
    },
    {
      name: 'Samantha',
      lang: 'en-US',
      voiceURI: 'samantha',
      localService: true,
    },
  ]),
  speaking: false,
  pending: false,
  paused: false,
};

export const mockSpeechSynthesisUtterance = vi.fn((text) => ({
  text,
  lang: 'en-US',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  voice: null,
  onend: null,
  onerror: null,
  onstart: null,
  onmark: null,
  onboundary: null,
  onpause: null,
  onresume: null,
}));

// Notification API Mock
export const mockNotification = {
  requestPermission: vi.fn().mockResolvedValue('granted'),
  permission: 'granted' as NotificationPermission,
  maxActions: 3,
};

export const mockNotificationConstructor = vi.fn((title: string, options: any = {}) => ({
  title,
  body: options.body || '',
  icon: options.icon,
  tag: options.tag,
  data: options.data,
  requireInteraction: options.requireInteraction || false,
  silent: options.silent || false,
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Permission API Mock
export const mockPermissions = {
  query: vi.fn().mockResolvedValue({ state: 'granted' }),
  request: vi.fn().mockResolvedValue({ state: 'granted' }),
};

// Battery API Mock
export const mockBattery = {
  level: 0.8,
  charging: true,
  chargingTime: 3600,
  dischargingTime: Infinity,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

// Vibration API Mock
export const mockVibration = {
  vibrate: vi.fn().mockReturnValue(true),
};

// Clipboard API Mock
export const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
  readText: vi.fn().mockResolvedValue(''),
  write: vi.fn().mockResolvedValue(undefined),
  read: vi.fn().mockResolvedValue([]),
};

// Share API Mock
export const mockShare = {
  canShare: vi.fn().mockReturnValue(true),
  share: vi.fn().mockResolvedValue(undefined),
};

// Payment API Mock
export const mockPaymentRequest = {
  show: vi.fn().mockResolvedValue({
    complete: vi.fn().mockResolvedValue('success'),
    toJSON: vi.fn(),
  }),
  abort: vi.fn(),
  canMakePayment: vi.fn().mockResolvedValue(true),
};

export const mockPaymentRequestConstructor = vi.fn();

// Credential Management API Mock
export const mockCredentialManager = {
  create: vi.fn().mockResolvedValue({ id: 'credential-1' }),
  get: vi.fn().mockResolvedValue(null),
  store: vi.fn().mockResolvedValue(undefined),
  preventSilentAccess: vi.fn(),
};

export const mockPasswordCredentialConstructor = vi.fn();
export const mockFederatedCredentialConstructor = vi.fn();
export const mockPublicKeyCredentialConstructor = vi.fn();

// IndexedDB Mock
export const mockIndexedDB = {
  open: vi.fn().mockReturnValue({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          put: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          delete: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          getAll: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
        }),
      }),
      createObjectStore: vi.fn(),
      deleteObjectStore: vi.fn(),
    },
  }),
  deleteDatabase: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
  databases: vi.fn().mockResolvedValue([]),
};

// Canvas Mock
export const mockCanvasRenderingContext2D = {
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
  putImageData: vi.fn(),
  createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 0, height: 0 }),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
};

export const mockCanvas = {
  getContext: vi.fn().mockReturnValue(mockCanvasRenderingContext2D),
  toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock'),
  toBlob: vi.fn(),
  width: 300,
  height: 150,
};

// WebSocket Mock
export const mockWebSocket = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
  readyState: 1,
  url: 'ws://localhost:8080',
  protocol: '',
  extensions: '',
  bufferedAmount: 0,
  binaryType: 'blob',
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
};

export const mockWebSocketConstructor = vi.fn(() => mockWebSocket);

// EventSource Mock
export const mockEventSource = {
  url: '',
  readyState: 1,
  withCredentials: false,
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  onopen: null,
  onmessage: null,
  onerror: null,
};

export const mockEventSourceConstructor = vi.fn(() => mockEventSource);

// Fetch Mock with helpers
export const createFetchMock = () => {
  const mockResponses = new Map<string, any>();

  const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    const key = typeof url === 'string' ? url : url.toString();
    const response = mockResponses.get(key);

    if (response) {
      if (typeof response === 'function') {
        return response(options);
      }
      return Promise.resolve(response);
    }

    // Default error response
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map(),
      json: async () => ({ error: 'Not found' }),
      text: async () => 'Not found',
    });
  });

  return {
    mockFetch,
    setResponse: (url: string, response: any) => {
      mockResponses.set(url, response);
    },
    clearResponses: () => {
      mockResponses.clear();
    },
  };
};

export const { mockFetch, setResponse, clearResponses } = createFetchMock();