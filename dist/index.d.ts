import React, { FC } from 'react';

interface Farmer {
    id: string;
    name: string;
    location: {
      latitude: number;
      longitude: number;
      region?: string;
    };
    contact: {
      phone: string;
      email?: string;
    };
    farm_size_ha: number;
    trees_count: number;
    trees_per_ha: number;
    farming_experience_years: number;
    cooperative?: string;
    avg_yield_per_tree_kg: number;
    annual_production_kg: number;
    primary_buyer: string;
    has_fermentation_facility: boolean;
    preferred_contact: 'SMS' | 'WhatsApp' | 'Phone Call';
    reliability_score?: number;
    crops: string[];
    production: {
        annual_kg: number;
        avg_yield_per_tree_kg: number;
    };
}
interface Harvest {
    farmer_id: string;
    harvest_date: string;
    beans_kg: number;
    quality_grade: 'A' | 'B' | 'C';
    price_per_kg: number;
    total_value: number;
    notes?: string;
}
interface Weather {
    date: string;
    temperature_min: number;
    temperature_max: number;
    humidity: number;
    rainfall_mm: number;
    forecast?: {
        next_7_days: WeatherForecast[];
    };
}
interface WeatherForecast {
    date: string;
    temperature_min: number;
    temperature_max: number;
    humidity: number;
    rainfall_chance: number;
    conditions: string;
}
interface Disease {
    id: string;
    name: string;
    scientific_name: string;
    type: 'fungal_disease' | 'insect_pest';
    severity: 'critical' | 'high' | 'medium' | 'low';
    parts_affected: string[];
    symptoms: string[];
    seasonal_pattern: {
        peak_months: string[];
        low_months: string[];
        weather_trigger: string;
    };
    prevention_measures: PreventionMeasure[];
}
interface PreventionMeasure {
    measure: string;
    timing: string;
    effectiveness: number;
    cost_level: 'low' | 'medium' | 'high';
}
interface Inventory {
    current_stock_kg: number;
    daily_usage_rate: number;
    safety_stock_kg: number;
    reorder_point_kg: number;
    last_updated: string;
}
interface Datasets {
    farmers?: Farmer[];
    harvests?: Harvest[];
    weather?: Weather[];
    diseases?: Disease[];
    inventory?: Inventory;
    [key: string]: any;
}

interface Message {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
    isStreaming?: boolean;
    actions?: Action[];
}
interface ChatSession {
    id: string;
    messages: Message[];
    createdAt: Date;
    lastMessageAt: Date;
}
type ActionType = 'show_supply_forecast' | 'show_farmer_list' | 'show_weather_alerts' | 'show_disease_map' | 'show_inventory' | 'open_farmer_profile' | 'send_notification' | 'custom';
interface Action {
    type: ActionType;
    data: any;
    priority: 'critical' | 'high' | 'medium' | 'low';
    timestamp: string;
}
interface Alert {
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
interface AlertRule {
    id: string;
    name: string;
    description: string;
    condition: string;
    threshold: number;
    enabled: boolean;
    priority: 'critical' | 'high' | 'medium' | 'low';
    actions: Action[];
}
interface VoiceState {
    isRecording: boolean;
    isPlaying: boolean;
    isListening: boolean;
    transcript: string;
    volume: number;
    isConnected: boolean;
    error?: string;
}
interface VoiceSettings {
    enabled: boolean;
    autoPlay: boolean;
    language: string;
    voice: string;
    rate: number;
    pitch: number;
}
type ThemeMode = 'light' | 'dark' | 'system';
type PositionType = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'sidebar' | 'fullscreen' | 'custom';
interface Theme {
    mode: ThemeMode;
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    accentColor?: string;
    customCSS?: string;
}
interface UIConfig {
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
interface JodexAIProps {
    apiUrl?: string;
    apiKey?: string;
    livekitUrl?: string;
    livekitToken?: string;
    systemPrompt?: string;
    instructions?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    datasets?: Datasets;
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
    voiceSettings?: Partial<VoiceSettings>;
    onAction?: (action: Action) => void;
    onMessage?: (message: Message) => void;
    onError?: (error: Error) => void;
    onReady?: () => void;
    onVoiceStart?: () => void;
    onVoiceEnd?: () => void;
    onAlert?: (alert: Alert) => void;
    streaming?: boolean;
    retryAttempts?: number;
    rateLimitPerMinute?: number;
    enableAlerts?: boolean;
    alertRules?: AlertRule[];
    debugMode?: boolean;
}
interface JodexAIState {
    isConnected: boolean;
    isLoading: boolean;
    messages: Message[];
    voiceState: VoiceState;
    alerts: Alert[];
    config: UIConfig;
    error?: string;
}
interface JodexError$1 extends Error {
    code: string;
    type: 'api' | 'voice' | 'network' | 'validation' | 'unknown';
    details?: any;
}
interface JodexError$1 extends Error {
    code: string;
    type: 'api' | 'voice' | 'network' | 'validation' | 'unknown';
    details?: any;
}
interface StorageData {
    messages: Message[];
    settings: Partial<UIConfig>;
    voiceSettings: Partial<VoiceSettings>;
    alerts: Alert[];
    lastActivity: string;
}

/**
 * Main Jodex AI Assistant Component
 */
declare const JodexAI: FC<JodexAIProps>;

interface ChatCompletionOptions {
    apiUrl?: string;
    apiKey?: string;
    systemPrompt?: string;
    instructions?: string;
    datasets?: Datasets;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    streaming?: boolean;
}
interface ChatCompletionResult {
    content: string;
    actions?: Action[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
declare class OpenAIClient {
    private options;
    constructor(options: ChatCompletionOptions);
    /**
     * Generate a chat completion with streaming support
     */
    streamChatCompletion(messages: Message[]): AsyncGenerator<ChatCompletionResult, void, unknown>;
    /**
     * Stream via API proxy (secure method)
     */
    private streamViaProxy;
    /**
     * Stream via direct OpenAI API (fallback method - not secure)
     */
    private streamViaDirectAPI;
    /**
     * Generate a single chat completion (non-streaming)
     */
    chatCompletion(messages: Message[]): Promise<ChatCompletionResult>;
    /**
     * Get completion via API proxy (secure method)
     */
    private completionViaProxy;
    /**
     * Get completion via direct OpenAI API (fallback method - not secure)
     */
    private completionViaDirectAPI;
    /**
     * Build the system prompt with context and datasets
     */
    private buildSystemPrompt;
    /**
     * Get the default system prompt for Jodex AI Assistant
     */
    private getDefaultSystemPrompt;
    /**
     * Build dataset context for the AI
     */
    private buildDatasetContext;
    /**
     * Format messages for OpenAI API
     */
    private formatMessages;
    /**
     * Extract actions from AI response
     */
    private extractActions;
    /**
     * Handle API errors and convert to JodexError
     */
    private handleError;
    /**
     * Update configuration
     */
    updateOptions(options: Partial<ChatCompletionOptions>): void;
    /**
     * Get current configuration
     */
    getOptions(): ChatCompletionOptions;
}

declare class JodexError extends Error {
    code: string;
    type: 'api' | 'voice' | 'network' | 'validation' | 'unknown';
    details?: any;
    constructor(message: string, type?: JodexError$1['type'], code?: string);
}

interface VoiceConnectionOptions {
    url: string;
    token?: string;
    roomName?: string;
    participantName?: string;
    participantIdentity?: string;
    useServerToken?: boolean;
    settings?: Partial<VoiceSettings>;
}
declare class VoiceConnection {
    private room;
    private localAudioTrack;
    private remoteAudioTrack;
    private mediaStream;
    private audioContext;
    private analyser;
    private isDestroyed;
    private tokenRefreshInterval;
    private volumeAnimationFrame;
    private options;
    private currentRoomName;
    private currentParticipantName;
    private state;
    private settings;
    private onStateChangeCallbacks;
    private onTranscriptCallbacks;
    private onErrorCallbacks;
    constructor(options: VoiceConnectionOptions);
    /**
     * Initialize LiveKit connection
     */
    private initializeConnection;
    /**
     * Initialize connection with server-side token generation
     */
    private initializeConnectionWithServerToken;
    /**
     * Generate token from server
     */
    private generateToken;
    /**
     * Set up token refresh for long-lived sessions
     */
    private setupTokenRefresh;
    /**
     * Set up LiveKit room event listeners
     */
    private setupEventListeners;
    /**
     * Start voice recording
     */
    startRecording(): Promise<void>;
    /**
     * Stop voice recording
     */
    stopRecording(): Promise<void>;
    /**
     * Start speech recognition
     */
    private startSpeechRecognition;
    /**
     * Stop speech recognition
     */
    private stopSpeechRecognition;
    /**
     * Start volume monitoring
     */
    private startVolumeMonitoring;
    /**
     * Stop volume monitoring
     */
    private stopVolumeMonitoring;
    /**
     * Speak text using text-to-speech
     */
    speak(text: string): Promise<void>;
    /**
     * Stop text-to-speech
     */
    stopSpeaking(): void;
    /**
     * Update voice settings
     */
    updateSettings(settings: Partial<VoiceSettings>): void;
    /**
     * Get current voice state
     */
    getState(): VoiceState;
    /**
     * Get current voice settings
     */
    getSettings(): VoiceSettings;
    /**
     * Add state change listener
     */
    onStateChange(callback: (state: VoiceState) => void): void;
    /**
     * Add transcript listener
     */
    onTranscript(callback: (transcript: string) => void): void;
    /**
     * Add error listener
     */
    onError(callback: (error: JodexError) => void): void;
    /**
     * Update internal state
     */
    private updateState;
    /**
     * Handle errors and convert to JodexError
     */
    private handleError;
    /**
     * Disconnect and clean up
     */
    disconnect(): Promise<void>;
}

/**
 * Action Queue Manager
 */
declare class ActionManager {
    private queue;
    private isProcessing;
    private onActionCallback?;
    constructor(onAction?: (action: Action) => void);
    /**
     * Add an action to the queue
     */
    addAction(action: Action): void;
    /**
     * Process the action queue
     */
    private processQueue;
    /**
     * Execute a single action
     */
    private executeAction;
    /**
     * Built-in handlers for common actions
     */
    private handleSupplyForecast;
    private handleFarmerList;
    private handleWeatherAlerts;
    private handleDiseaseMap;
    private handleInventory;
    private handleFarmerProfile;
    private handleNotification;
    /**
     * Clear all pending actions
     */
    clearQueue(): void;
    /**
     * Get the current queue status
     */
    getQueueStatus(): {
        pending: number;
        isProcessing: boolean;
    };
}
/**
 * Validate action structure
 */
declare function validateAction(action: any): action is Action;
/**
 * Create a new action with default values
 */
declare function createAction(type: Action['type'], data: any, priority?: Action['priority']): Action;
/**
 * Action type constants for easy reference
 */
declare const ACTION_TYPES: {
    readonly SHOW_SUPPLY_FORECAST: "show_supply_forecast";
    readonly SHOW_FARMER_LIST: "show_farmer_list";
    readonly SHOW_WEATHER_ALERTS: "show_weather_alerts";
    readonly SHOW_DISEASE_MAP: "show_disease_map";
    readonly SHOW_INVENTORY: "show_inventory";
    readonly OPEN_FARMER_PROFILE: "open_farmer_profile";
    readonly SEND_NOTIFICATION: "send_notification";
    readonly CUSTOM: "custom";
};

/**
 * Storage Manager for persisting data
 */
declare class StorageManager {
    private storageKey;
    private isLocalStorageAvailable;
    constructor(storageKey?: string);
    /**
     * Check if localStorage is available
     */
    private checkLocalStorageAvailability;
    /**
     * Save data to storage
     */
    save(data: Partial<StorageData>): void;
    /**
     * Load data from storage
     */
    load(): StorageData;
    /**
     * Clear all stored data
     */
    clear(): void;
    /**
     * Get default storage data
     */
    private getDefaultStorageData;
    /**
     * Save messages
     */
    saveMessages(messages: Message[]): void;
    /**
     * Load messages
     */
    loadMessages(): Message[];
    /**
     * Save settings
     */
    saveSettings(settings: Partial<UIConfig>): void;
    /**
     * Load settings
     */
    loadSettings(): Partial<UIConfig>;
    /**
     * Save voice settings
     */
    saveVoiceSettings(settings: Partial<VoiceSettings>): void;
    /**
     * Load voice settings
     */
    loadVoiceSettings(): Partial<VoiceSettings>;
    /**
     * Save alerts
     */
    saveAlerts(alerts: Alert[]): void;
    /**
     * Load alerts
     */
    loadAlerts(): Alert[];
    /**
     * Get storage size
     */
    getStorageSize(): number;
    /**
     * Check if storage is getting full
     */
    isStorageNearFull(): boolean;
}
/**
 * In-memory storage for fallback
 */
declare class MemoryStorage {
    private data;
    constructor();
    save(data: Partial<StorageData>): void;
    load(): StorageData;
    clear(): void;
}
/**
 * Factory function to create appropriate storage manager
 */
declare function createStorageManager(storageKey?: string): StorageManager | MemoryStorage;

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
declare const ChatInterface: React.FC<ChatInterfaceProps>;

/**
 * Browser compatibility utilities for Jodex AI Assistant
 */
interface BrowserCompatibility {
    supported: boolean;
    features: {
        webAudio: boolean;
        mediaDevices: boolean;
        getUserMedia: boolean;
        webkitSpeechRecognition: boolean;
        speechRecognition: boolean;
        webRTC: boolean;
    };
    browser: {
        name: string;
        version: string;
        isMobile: boolean;
    };
    issues: string[];
}

interface VoiceInterfaceProps {
    voiceState: VoiceState;
    onToggleRecording: () => void;
    config: UIConfig;
    browserCompatibility?: BrowserCompatibility;
}
declare const VoiceInterface: React.FC<VoiceInterfaceProps>;

interface AlertPanelProps {
    alerts: Alert[];
    onAcknowledge: (alertId: string) => void;
    onDismiss: (alertId: string) => void;
}
declare const AlertPanel: React.FC<AlertPanelProps>;

export { ACTION_TYPES, type Action, ActionManager, type ActionType, type Alert, AlertPanel, type AlertRule, ChatInterface, type ChatSession, type Datasets, type Disease, type Farmer, type Harvest, type Inventory, JodexAI, type JodexAIProps, type JodexAIState, type JodexError$1 as JodexError, type Message, OpenAIClient, type PositionType, type PreventionMeasure, type StorageData, StorageManager, type Theme, type ThemeMode, type UIConfig, VoiceConnection, VoiceInterface, type VoiceSettings, type VoiceState, type Weather, type WeatherForecast, createAction, createStorageManager, validateAction };
