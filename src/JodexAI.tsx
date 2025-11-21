import { useState, useEffect, useCallback, useRef } from 'react';
import type { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { create } from 'zustand';

import {
  JodexAIProps,
  JodexAIState,
  Message,
  VoiceState,
  Alert,
  UIConfig,
  Theme
} from './types';
import { OpenAIClient } from './lib/openai';
import { VoiceConnection } from './lib/livekit';
import { ActionManager } from './lib/actions';
import { createStorageManager } from './lib/storage';

import { ChatInterface } from './components/ChatInterface';
import { VoiceInterface } from './components/VoiceInterface';
import { AlertPanel } from './components/AlertPanel';
import { NoSSR } from './components/NoSSR';
import { ErrorBoundary } from './components/ErrorBoundary';
import { checkBrowserCompatibility } from './lib/browser-compatibility';
import { loadVoiceDependencies } from './lib/dynamic-imports';

// Default configuration
const DEFAULT_CONFIG = {
  position: 'bottom-right' as const,
  width: 384,
  height: 600,
  collapsed: false,
  showHeader: true,
  showFooter: true,
  showTimestamps: true,
  maxMessages: 50,
  animations: true,
  title: 'Jodex AI Assistant',
};

const DEFAULT_THEME: Theme = {
  mode: 'system',
  primaryColor: '#3b82f6',
  backgroundColor: undefined,
  textColor: undefined,
  borderColor: undefined,
  accentColor: undefined,
  customCSS: undefined,
};

/**
 * Zustand store for managing component state
 */
interface JodexStore extends JodexAIState {
  // Actions
  setIsConnected: (connected: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setMessages: (messages: Message[]) => void;
  updateVoiceState: (updates: Partial<VoiceState>) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (id: string, updates: Partial<Alert>) => void;
  removeAlert: (id: string) => void;
  setConfig: (config: UIConfig) => void;
  setError: (error?: string) => void;
  clearError: () => void;
}

const useJodexStore = create<JodexStore>((set, get) => ({
  // Initial state
  isConnected: false,
  isLoading: false,
  messages: [],
  voiceState: {
    isRecording: false,
    isPlaying: false,
    isListening: false,
    transcript: '',
    volume: 0,
    isConnected: false,
    error: undefined,
  },
  alerts: [],
  config: { ...DEFAULT_CONFIG, theme: DEFAULT_THEME },
  error: undefined,

  // Actions
  setIsConnected: (connected) => set({ isConnected: connected }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages.slice(-(state.config.maxMessages || 50) + 1), message]
  })),
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map(msg =>
      msg.id === id ? { ...msg, ...updates } : msg
    )
  })),
  setMessages: (messages) => set({ messages }),
  updateVoiceState: (updates) => set((state) => ({
    voiceState: { ...state.voiceState, ...updates }
  })),
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts].slice(0, 10) // Keep only last 10 alerts
  })),
  updateAlert: (id, updates) => set((state) => ({
    alerts: state.alerts.map(alert =>
      alert.id === id ? { ...alert, ...updates } : alert
    )
  })),
  removeAlert: (id) => set((state) => ({
    alerts: state.alerts.filter(alert => alert.id !== id)
  })),
  setConfig: (config) => set({ config }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: undefined }),
}));

/**
 * Main Jodex AI Assistant Component
 */
export const JodexAI: FC<JodexAIProps> = (props) => {
  const {
    apiUrl,
    apiKey,
    livekitUrl,
    livekitToken,
    systemPrompt,
    instructions,
    model = 'gpt-4-turbo-preview',
    temperature = 0.7,
    maxTokens = 2000,
    datasets,
    theme = DEFAULT_THEME,
    position = DEFAULT_CONFIG.position,
    width = DEFAULT_CONFIG.width,
    height = DEFAULT_CONFIG.height,
    collapsed = DEFAULT_CONFIG.collapsed,
    voiceEnabled = true,
    showHeader = DEFAULT_CONFIG.showHeader,
    showFooter = DEFAULT_CONFIG.showFooter,
    showTimestamps = DEFAULT_CONFIG.showTimestamps,
    maxMessages = DEFAULT_CONFIG.maxMessages,
    animations = DEFAULT_CONFIG.animations,
    logo,
    title = DEFAULT_CONFIG.title,
    voiceSettings,
    onAction,
    onMessage,
    onError,
    onReady,
    onVoiceStart,
    onVoiceEnd,
    onAlert,
    streaming = true,
    retryAttempts = 3,
    rateLimitPerMinute = 10,
    enableAlerts = true,
    alertRules = [],
    debugMode = false,
  } = props;

  // Store state
  const {
    isConnected,
    isLoading,
    messages,
    voiceState,
    alerts,
    config,
    error,
    setIsConnected,
    setIsLoading,
    addMessage,
    updateMessage,
    setMessages,
    updateVoiceState,
    addAlert,
    updateAlert,
    removeAlert,
    setConfig,
    setError,
    clearError,
  } = useJodexStore();

  // Component refs
  const openaiClientRef = useRef<OpenAIClient | null>(null);
  const voiceConnectionRef = useRef<VoiceConnection | null>(null);
  const actionManagerRef = useRef<ActionManager | null>(null);
  const storageRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  // Local state
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [currentTheme, setCurrentTheme] = useState<Theme>(theme as Theme);
  const [voiceDependenciesLoaded, setVoiceDependenciesLoaded] = useState(false);
  const [browserCompatibility, setBrowserCompatibility] = useState(() => {
    // Only check compatibility on client-side
    if (typeof window !== 'undefined') {
      return checkBrowserCompatibility();
    }
    return {
      supported: false,
      features: {
        webAudio: false,
        mediaDevices: false,
        getUserMedia: false,
        webkitSpeechRecognition: false,
        speechRecognition: false,
        webRTC: false,
      },
      browser: {
        name: 'unknown',
        version: 'unknown',
        isMobile: false,
      },
      issues: ['Server-side rendering'],
    };
  });

  /**
   * Initialize the component
   */
  const initialize = useCallback(async () => {
    if (isInitializedRef.current) return;

    try {
      setIsLoading(true);
      clearError();

      // Initialize storage
      storageRef.current = createStorageManager('jodex-ai-assistant');

      // Load saved data
      const savedMessages = storageRef.current.loadMessages();
      if (savedMessages.length > 0) {
        setMessages(savedMessages);
      }

      // Initialize OpenAI client
      openaiClientRef.current = new OpenAIClient({
        apiUrl,
        apiKey, // Fallback for backward compatibility
        systemPrompt,
        instructions,
        datasets,
        model,
        temperature,
        maxTokens,
        streaming,
      });

      // Initialize action manager
      actionManagerRef.current = new ActionManager(onAction);

      // Initialize voice connection if enabled
      if (voiceEnabled && livekitUrl) {
        try {
          // Use server-side token generation by default, but allow legacy token usage
          voiceConnectionRef.current = new VoiceConnection({
            url: livekitUrl,
            roomName: 'jodex-ai-room',
            participantName: 'Jodex AI User',
            useServerToken: !livekitToken, // Use server-side token if no token provided
            token: livekitToken, // Use provided token if available (legacy mode)
            settings: voiceSettings,
          });

          // Set up voice event listeners
          voiceConnectionRef.current.onStateChange((state) => {
            updateVoiceState(state);
          });

          voiceConnectionRef.current.onTranscript((transcript) => {
            if (transcript.trim()) {
              handleSendMessage(transcript);
            }
          });

          voiceConnectionRef.current.onError((error) => {
            setError(error.message);
            onError?.(error);
          });

        } catch (voiceError) {
          console.warn('Voice initialization failed:', voiceError);
          if (debugMode) {
            console.error('Voice error details:', voiceError);
          }
        }
      }

      // Set up configuration
      const finalConfig: UIConfig = {
        ...DEFAULT_CONFIG,
        position,
        width: width ?? DEFAULT_CONFIG.width,
        height: height ?? DEFAULT_CONFIG.height,
        collapsed,
        showHeader,
        showFooter,
        showTimestamps,
        maxMessages,
        animations,
        logo: logo || undefined,
        title,
        theme: currentTheme,
      };

      setConfig(finalConfig);

      setIsConnected(true);
      setIsLoading(false);

      onReady?.();

    } catch (error) {
      console.error('Initialization failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      onError?.(error as Error);
      setIsLoading(false);
    }

    isInitializedRef.current = true;
  }, [
    apiKey, systemPrompt, instructions, datasets, model, temperature, maxTokens,
    streaming, voiceEnabled, livekitUrl, livekitToken, voiceSettings, onAction,
    onReady, onError, position, width, height, collapsed, showHeader, showFooter,
    showTimestamps, maxMessages, animations, logo, title, currentTheme,
    setIsLoading, clearError, setMessages, updateVoiceState, setError,
    setConfig, setIsConnected, addMessage, debugMode,
  ]);

  /**
   * Handle sending a message
   */
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !openaiClientRef.current || isLoading) {
      return;
    }

    let assistantMessage: Message;

    try {
      setIsLoading(true);

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: content.trim(),
        role: 'user',
        timestamp: new Date(),
      };
      addMessage(userMessage);
      onMessage?.(userMessage);

      // Create assistant message placeholder
      assistantMessage = {
        id: `assistant-${Date.now()}`,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        isStreaming: true,
      };
      addMessage(assistantMessage);

      // Get AI response
      if (streaming) {
        let fullContent = '';
        const stream = openaiClientRef.current.streamChatCompletion(messages);

        for await (const chunk of stream) {
          fullContent += chunk.content;

          updateMessage(assistantMessage.id, {
            content: fullContent,
            isStreaming: true,
          });

          // Handle actions when streaming is complete
          if (chunk.actions && chunk.actions.length > 0) {
            chunk.actions.forEach(action => {
              actionManagerRef.current?.addAction(action);
            });
          }
        }

        updateMessage(assistantMessage.id, {
          content: fullContent,
          isStreaming: false,
        });

      } else {
        const response = await openaiClientRef.current.chatCompletion(messages);

        updateMessage(assistantMessage.id, {
          content: response.content,
          isStreaming: false,
          actions: response.actions,
        });

        // Handle actions
        if (response.actions && response.actions.length > 0) {
          response.actions.forEach(action => {
            actionManagerRef.current?.addAction(action);
          });
        }
      }

      const finalAssistantMessage: Message = {
        ...assistantMessage,
        content: assistantMessage.content,
        isStreaming: false,
      };
      onMessage?.(finalAssistantMessage);

      // Save messages to storage
      if (storageRef.current) {
        storageRef.current.saveMessages([...messages, userMessage, finalAssistantMessage]);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      onError?.(error as Error);

      // Remove the streaming assistant message on error
      setMessages(messages.filter(msg => msg.id !== assistantMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [
    messages, isLoading, addMessage, updateMessage, setMessages, onMessage,
    onError, setError, setIsLoading, streaming,
  ]);

  /**
   * Handle voice recording toggle
   */
  const handleToggleRecording = useCallback(async () => {
    if (!voiceConnectionRef.current) return;

    try {
      if (voiceState.isRecording) {
        await voiceConnectionRef.current.stopRecording();
        onVoiceEnd?.();
      } else {
        await voiceConnectionRef.current.startRecording();
        onVoiceStart?.();
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Voice recording failed';
      setError(errorMessage);
      onError?.(error as Error);
    }
  }, [voiceState.isRecording, onVoiceStart, onVoiceEnd, onError, setError]);

  /**
   * Handle alert acknowledgment
   */
  const handleAlertAcknowledge = useCallback((alertId: string) => {
    updateAlert(alertId, { acknowledged: true });

    if (storageRef.current) {
      const currentAlerts = [...alerts];
      const updatedAlerts = currentAlerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      );
      storageRef.current.saveAlerts(updatedAlerts);
    }
  }, [alerts, updateAlert]);

  /**
   * Handle alert dismissal
   */
  const handleAlertDismiss = useCallback((alertId: string) => {
    removeAlert(alertId);

    if (storageRef.current) {
      const updatedAlerts = alerts.filter(alert => alert.id !== alertId);
      storageRef.current.saveAlerts(updatedAlerts);
    }
  }, [alerts, removeAlert]);

  /**
   * Handle theme changes
   */
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    const resolvedTheme = typeof theme === 'string'
      ? { mode: theme } as Theme
      : theme;

    setCurrentTheme(resolvedTheme);

    // Apply theme to document with SSR safety
    const isDark = resolvedTheme.mode === 'dark' ||
      (resolvedTheme.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply custom CSS with SSR safety
    if (resolvedTheme.customCSS) {
      const existingStyle = document.getElementById('jodex-custom-theme');
      if (existingStyle) {
        existingStyle.remove();
      }

      const style = document.createElement('style');
      style.id = 'jodex-custom-theme';
      style.textContent = resolvedTheme.customCSS;
      document.head.appendChild(style);
    }

    // Cleanup function
    return () => {
      // Remove custom CSS on cleanup
      const customStyle = document.getElementById('jodex-custom-theme');
      if (customStyle) {
        customStyle.remove();
      }
    };
  }, [theme]);

  /**
   * Load voice dependencies dynamically
   */
  useEffect(() => {
    if (voiceEnabled && typeof window !== 'undefined') {
      loadVoiceDependencies()
        .then((dependencies) => {
          setVoiceDependenciesLoaded(dependencies.motion);
        })
        .catch((error) => {
          console.warn('Failed to load voice dependencies:', error);
        });
    }
  }, [voiceEnabled]);

  /**
   * Initialize component on mount
   */
  useEffect(() => {
    initialize();

    return () => {
      // Cleanup on unmount
      voiceConnectionRef.current?.disconnect();
      isInitializedRef.current = false;
    };
  }, [initialize]);

  /**
   * Render the component based on position
   */
  const renderChatInterface = () => {
    if (isCollapsed) {
      return (
        <motion.div
          className={`jodex-collapsed jodex-position-${position}`}
          onClick={() => setIsCollapsed(false)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {logo ? (
            <img src={logo} alt="Jodex AI" className="w-6 h-6" />
          ) : (
            <span className="text-lg font-bold">JD</span>
          )}
        </motion.div>
      );
    }

    return (
      <motion.div
        className={`jodex-chat-container jodex-position-${position} ${
          position === 'fullscreen' ? 'w-full h-full' : ''
        }`}
        style={{
          width: position !== 'fullscreen' ? width : undefined,
          height: position !== 'fullscreen' ? height : undefined,
        }}
        initial={animations ? { scale: 0.8, opacity: 0 } : undefined}
        animate={animations ? { scale: 1, opacity: 1 } : undefined}
        exit={animations ? { scale: 0.8, opacity: 0 } : undefined}
        transition={{ duration: 0.2 }}
      >
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onCollapse={() => setIsCollapsed(true)}
          config={config}
          showHeader={showHeader}
          showFooter={showFooter}
          showTimestamps={showTimestamps}
          voiceEnabled={voiceEnabled}
        />

        {voiceEnabled && voiceDependenciesLoaded && (
          <NoSSR fallback={null}>
            <VoiceInterface
              voiceState={voiceState}
              onToggleRecording={handleToggleRecording}
              config={config}
              browserCompatibility={browserCompatibility}
            />
          </NoSSR>
        )}

        {enableAlerts && alerts.length > 0 && (
          <AlertPanel
            alerts={alerts}
            onAcknowledge={handleAlertAcknowledge}
            onDismiss={handleAlertDismiss}
          />
        )}
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      <div className="jodex-container">
        <ErrorBoundary
          onError={(error, errorInfo) => {
            console.error('Jodex AI Error:', error, errorInfo);
            onError?.(error);
          }}
          showRetry={!debugMode}
        >
          {renderChatInterface()}

          {error && debugMode && (
            <div className="fixed bottom-4 left-4 bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-sm z-[60]">
              <strong>Error:</strong> {error}
            </div>
          )}
        </ErrorBoundary>
      </div>
    </AnimatePresence>
  );
};

// Display name for debugging
JodexAI.displayName = 'JodexAI';