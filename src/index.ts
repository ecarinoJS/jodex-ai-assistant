// Main component export
export { JodexAI } from './JodexAI';

// Type exports
export type {
  // Core types
  JodexAIProps,
  JodexAIState,
  JodexError,

  // Message and chat types
  Message,
  ChatSession,

  // Action system
  Action,
  ActionType,

  // Voice system
  VoiceState,
  VoiceSettings,

  // UI configuration
  Theme,
  ThemeMode,
  PositionType,
  UIConfig,

  // Alert system
  Alert,
  AlertRule,

  // Dataset types
  Farmer,
  Harvest,
  Weather,
  WeatherForecast,
  Disease,
  PreventionMeasure,
  Inventory,
  Datasets,

  // Storage types
  StorageData,
} from './types';

// Utility exports
export { OpenAIClient } from './lib/openai';
export { VoiceConnection } from './lib/livekit';
export { ActionManager, validateAction, createAction, ACTION_TYPES } from './lib/actions';
export { StorageManager, createStorageManager } from './lib/storage';

// Component exports (for advanced usage)
export { ChatInterface } from './components/ChatInterface';
export { VoiceInterface } from './components/VoiceInterface';
export { AlertPanel } from './components/AlertPanel';

// CSS export (commented out for now - will be handled separately)
// import './styles/index.css';