import { Datasets } from './datasets';

// Error Types
export interface JodexError extends Error {
  code: string;
  type: 'api' | 'voice' | 'network' | 'validation' | 'unknown';
  details?: any;
}

// Message and Chat Types
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
  actions?: Action[];
}

export interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: Date;
  lastMessageAt: Date;
}

// Action System Types
export type ActionType =
  | 'show_supply_forecast'
  | 'show_farmer_list'
  | 'show_weather_alerts'
  | 'show_disease_map'
  | 'show_inventory'
  | 'open_farmer_profile'
  | 'send_notification'
  | 'custom';

export interface Action {
  type: ActionType;
  data: any;
  priority: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
}

// Alert System Types
export interface Alert {
  id: string;
  type: 'weather' | 'disease' | 'supply' | 'inventory' | 'custom';
  title: string;
  message: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  timestamp: Date;
  acknowledged?: boolean;
  dismissed?: boolean;
  snoozedUntil?: Date;
  actions?: Action[];
}

export interface AlertPanelProps {
  alerts: Alert[];
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: string; // JSONPath or custom expression
  threshold: number;
  enabled: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  actions: Action[];
}

// Voice System Types
export interface VoiceState {
  isRecording: boolean;
  isPlaying: boolean;
  isListening: boolean;
  transcript: string;
  volume: number;
  isConnected: boolean;
  error?: string;
}

export interface VoiceSettings {
  enabled: boolean;
  autoPlay: boolean;
  language: string;
  voice: string;
  rate: number;
  pitch: number;
}

// Theme and UI Types
export type ThemeMode = 'light' | 'dark' | 'system';
export type PositionType = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'sidebar' | 'fullscreen' | 'custom';

export interface Theme {
  mode: ThemeMode;
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  accentColor?: string;
  customCSS?: string;
}

export interface UIConfig {
  theme: Theme | ThemeMode;
  position: PositionType;
  width?: string | number;
  height?: string | number;
  collapsed?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  showTimestamps?: boolean;
  maxMessages?: number;
  animations?: boolean;
  logo?: string;
  title?: string;
}

// Component Props
export interface JodexAIProps {
  // Required - Either API proxy URL or direct API key
  apiUrl?: string; // API proxy URL for secure calls (recommended)
  apiKey?: string; // OpenAI API key (deprecated, use apiUrl instead)

  // Voice Configuration (optional if voiceEnabled=false)
  livekitUrl?: string;
  livekitToken?: string; // Optional when using server-side token generation

  // AI Configuration
  systemPrompt?: string;
  instructions?: string;
  model?: string; // OpenAI model, e.g., 'gpt-4-turbo-preview'
  temperature?: number;
  maxTokens?: number;

  // Data Integration
  datasets?: Datasets;

  // UI Configuration
  theme?: Theme | ThemeMode;
  position?: PositionType;
  width?: string | number;
  height?: string | number;
  collapsed?: boolean;
  voiceEnabled?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  showTimestamps?: boolean;
  maxMessages?: number;
  animations?: boolean;
  logo?: string;
  title?: string;

  // Voice Configuration
  voiceSettings?: Partial<VoiceSettings>;

  // Callbacks
  onAction?: (action: Action) => void;
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
  onReady?: () => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onAlert?: (alert: Alert) => void;

  // Advanced Configuration
  streaming?: boolean;
  retryAttempts?: number;
  rateLimitPerMinute?: number;
  enableAlerts?: boolean;
  alertRules?: AlertRule[];
  debugMode?: boolean;
}

// Component State
export interface JodexAIState {
  isConnected: boolean;
  isLoading: boolean;
  messages: Message[];
  voiceState: VoiceState;
  alerts: Alert[];
  config: UIConfig;
  error?: string;
}

// Error Types
export interface JodexError extends Error {
  code: string;
  type: 'api' | 'voice' | 'network' | 'validation' | 'unknown';
  details?: any;
}

// Storage Types
export interface StorageData {
  messages: Message[];
  settings: Partial<UIConfig>;
  voiceSettings: Partial<VoiceSettings>;
  alerts: Alert[];
  lastActivity: string;
}

// Re-export types from datasets module
export type {
  Datasets,
  Farmer,
  Harvest,
  Weather,
  WeatherForecast,
  Disease,
  PreventionMeasure,
  Inventory,
} from './datasets';