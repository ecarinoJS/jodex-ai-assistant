import { useState, useRef, useEffect, useCallback, Component } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { create } from 'zustand';
import { Room } from 'livekit-client';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';

// src/JodexAI.tsx

// src/lib/errors.ts
var JodexError = class extends Error {
  constructor(message, type = "unknown", code) {
    super(message);
    this.name = "JodexError";
    this.type = type;
    this.code = code || "UNKNOWN_ERROR";
  }
};

// src/lib/openai.ts
var OpenAIClient = class {
  constructor(options) {
    if (!options.apiUrl && !options.apiKey) {
      throw new JodexError(
        "Either apiUrl (recommended for security) or apiKey is required",
        "validation",
        "MISSING_API_CONFIG"
      );
    }
    if (options.apiKey) {
      console.warn(
        "Using API key directly is not recommended. Consider using an API proxy route for better security."
      );
    }
    this.options = {
      model: "gpt-4-turbo-preview",
      temperature: 0.7,
      maxTokens: 2e3,
      streaming: true,
      ...options
    };
  }
  /**
   * Generate a chat completion with streaming support
   */
  async *streamChatCompletion(messages) {
    try {
      const systemContent = this.buildSystemPrompt();
      const openaiMessages = this.formatMessages(messages, systemContent);
      if (this.options.apiUrl) {
        yield* this.streamViaProxy(openaiMessages);
      } else {
        yield* this.streamViaDirectAPI(openaiMessages);
      }
    } catch (error) {
      const jodexError = this.handleError(error);
      throw jodexError;
    }
  }
  /**
   * Stream via API proxy (secure method)
   */
  async *streamViaProxy(openaiMessages) {
    const response = await fetch(`${this.options.apiUrl}/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: openaiMessages,
        model: this.options.model,
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new JodexError(
        errorData.error || "API request failed",
        "api",
        "PROXY_ERROR"
      );
    }
    const reader = response.body?.getReader();
    if (!reader) {
      throw new JodexError("No response body", "api", "NO_RESPONSE_BODY");
    }
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                throw new JodexError(parsed.error, "api", "PROXY_ERROR");
              }
              if (parsed.done) {
                const actions = this.extractActions(parsed.content || "");
                yield {
                  content: parsed.content || "",
                  actions
                };
                return;
              }
              if (parsed.content) {
                yield { content: parsed.content };
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE data:", data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  /**
   * Stream via direct OpenAI API (fallback method - not secure)
   */
  async *streamViaDirectAPI(openaiMessages) {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: this.options.apiKey,
      dangerouslyAllowBrowser: true
    });
    const stream = await client.chat.completions.create({
      model: this.options.model,
      messages: openaiMessages,
      temperature: this.options.temperature,
      max_tokens: this.options.maxTokens,
      stream: true
    });
    let content = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta.content) {
        content += delta.content;
        yield { content };
      }
      if (chunk.choices[0]?.finish_reason === "stop") {
        const actions = this.extractActions(content);
        yield {
          content,
          actions,
          usage: chunk.usage ? {
            promptTokens: chunk.usage.prompt_tokens || 0,
            completionTokens: chunk.usage.completion_tokens || 0,
            totalTokens: chunk.usage.total_tokens || 0
          } : void 0
        };
      }
    }
  }
  /**
   * Generate a single chat completion (non-streaming)
   */
  async chatCompletion(messages) {
    try {
      const systemContent = this.buildSystemPrompt();
      const openaiMessages = this.formatMessages(messages, systemContent);
      if (this.options.apiUrl) {
        return await this.completionViaProxy(openaiMessages);
      } else {
        return await this.completionViaDirectAPI(openaiMessages);
      }
    } catch (error) {
      const jodexError = this.handleError(error);
      throw jodexError;
    }
  }
  /**
   * Get completion via API proxy (secure method)
   */
  async completionViaProxy(openaiMessages) {
    const response = await fetch(this.options.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: openaiMessages,
        model: this.options.model,
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new JodexError(
        errorData.error || "API request failed",
        "api",
        "PROXY_ERROR"
      );
    }
    const data = await response.json();
    const content = data.content || "";
    const actions = this.extractActions(content);
    return {
      content,
      actions
    };
  }
  /**
   * Get completion via direct OpenAI API (fallback method - not secure)
   */
  async completionViaDirectAPI(openaiMessages) {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: this.options.apiKey,
      dangerouslyAllowBrowser: true
    });
    const response = await client.chat.completions.create({
      model: this.options.model,
      messages: openaiMessages,
      temperature: this.options.temperature,
      max_tokens: this.options.maxTokens,
      stream: false
    });
    const content = response.choices[0]?.message?.content || "";
    const actions = this.extractActions(content);
    return {
      content,
      actions,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens || 0,
        completionTokens: response.usage.completion_tokens || 0,
        totalTokens: response.usage.total_tokens || 0
      } : void 0
    };
  }
  /**
   * Build the system prompt with context and datasets
   */
  buildSystemPrompt() {
    const parts = [];
    if (this.options.systemPrompt) {
      parts.push(this.options.systemPrompt);
    } else {
      parts.push(this.getDefaultSystemPrompt());
    }
    if (this.options.instructions) {
      parts.push(`
Additional Instructions:
${this.options.instructions}`);
    }
    if (this.options.datasets) {
      parts.push(this.buildDatasetContext(this.options.datasets));
    }
    return parts.join("\n\n");
  }
  /**
   * Get the default system prompt for Jodex AI Assistant
   */
  getDefaultSystemPrompt() {
    return `You are Jodex, an AI assistant specializing in agricultural supply chain management for cacao farming operations.

Your role is to help farmers, processors, and agricultural cooperatives make informed decisions by analyzing data about farmers, weather conditions, harvest records, disease patterns, and inventory levels.

Key capabilities:
- Analyze farmer data and production trends
- Provide weather-based insights and alerts
- Identify disease risk factors based on weather patterns
- Help with inventory management and supply forecasting
- Suggest optimal actions based on data analysis

When responding:
1. Be helpful, proactive, and practical
2. Base your recommendations on the provided data
3. Suggest specific, actionable steps
4. Alert users to potential problems or opportunities
5. Keep responses concise but comprehensive

You can trigger UI actions using this format:
\`\`\`action
{
  "type": "action_type",
  "data": { ... },
  "priority": "high|medium|low"
}
\`\`\`

Available action types:
- show_supply_forecast: Show supply predictions
- show_farmer_list: Display farmer information
- show_weather_alerts: Show weather-based alerts
- show_disease_map: Display disease risk information
- show_inventory: Show current inventory levels
- open_farmer_profile: Show specific farmer details
- send_notification: Send a notification message`;
  }
  /**
   * Build dataset context for the AI
   */
  buildDatasetContext(datasets) {
    const contextParts = [];
    contextParts.push("Available Data:");
    if (datasets.farmers && datasets.farmers.length > 0) {
      contextParts.push(`- Farmers: ${datasets.farmers.length} profiles with production data`);
    }
    if (datasets.harvests && datasets.harvests.length > 0) {
      contextParts.push(`- Harvest Records: ${datasets.harvests.length} historical records`);
    }
    if (datasets.weather && datasets.weather.length > 0) {
      contextParts.push(`- Weather Data: ${datasets.weather.length} days of data`);
    }
    if (datasets.diseases && datasets.diseases.length > 0) {
      contextParts.push(`- Disease Database: ${datasets.diseases.length} disease/pest entries`);
    }
    if (datasets.inventory) {
      contextParts.push(`- Inventory: Current stock levels and usage rates`);
    }
    Object.keys(datasets).forEach((key) => {
      if (!["farmers", "harvests", "weather", "diseases", "inventory"].includes(key)) {
        const data = datasets[key];
        if (Array.isArray(data)) {
          contextParts.push(`- ${key}: ${data.length} entries`);
        } else {
          contextParts.push(`- ${key}: Available data`);
        }
      }
    });
    return contextParts.join("\n");
  }
  /**
   * Format messages for OpenAI API
   */
  formatMessages(messages, systemContent) {
    const openaiMessages = [
      {
        role: "system",
        content: systemContent
      }
    ];
    messages.filter((msg) => msg.role === "user").forEach((msg) => {
      openaiMessages.push({
        role: "user",
        content: msg.content
      });
    });
    return openaiMessages;
  }
  /**
   * Extract actions from AI response
   */
  extractActions(content) {
    const actions = [];
    const actionRegex = /```action\s*([\s\S]*?)```/g;
    let match;
    while ((match = actionRegex.exec(content)) !== null) {
      try {
        const actionData = JSON.parse(match[1].trim());
        actions.push({
          type: actionData.type || "custom",
          data: actionData.data || {},
          priority: actionData.priority || "medium",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (error) {
        console.warn("Failed to parse action:", match[1]);
      }
    }
    return actions;
  }
  /**
   * Handle API errors and convert to JodexError
   */
  handleError(error) {
    if (error instanceof JodexError) {
      return error;
    }
    if (error.status === 401) {
      return new JodexError("Invalid OpenAI API key", "api", "INVALID_API_KEY");
    }
    if (error.status === 429) {
      return new JodexError("Rate limit exceeded. Please try again later.", "api", "RATE_LIMIT");
    }
    if (error.status >= 500) {
      return new JodexError("OpenAI service temporarily unavailable", "api", "SERVICE_UNAVAILABLE");
    }
    const jodexError = new JodexError(error.message || "Unknown error occurred", "api", "UNKNOWN_ERROR");
    jodexError.details = error;
    return jodexError;
  }
  /**
   * Update configuration
   */
  updateOptions(options) {
    this.options = { ...this.options, ...options };
    if (options.apiKey) {
      console.warn(
        "Using API key directly is not recommended. Consider using an API proxy route for better security."
      );
    }
  }
  /**
   * Get current configuration
   */
  getOptions() {
    return { ...this.options };
  }
};
var VoiceConnection = class {
  constructor(options) {
    this.room = null;
    this.localAudioTrack = null;
    this.remoteAudioTrack = null;
    this.mediaStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.isDestroyed = false;
    this.tokenRefreshInterval = null;
    this.volumeAnimationFrame = null;
    this.currentRoomName = "";
    this.currentParticipantName = "";
    this.state = {
      isRecording: false,
      isPlaying: false,
      isListening: false,
      transcript: "",
      volume: 0,
      isConnected: false,
      error: void 0
    };
    this.settings = {
      enabled: true,
      autoPlay: true,
      language: "en-US",
      voice: "default",
      rate: 1,
      pitch: 1
    };
    this.onStateChangeCallbacks = [];
    this.onTranscriptCallbacks = [];
    this.onErrorCallbacks = [];
    this.options = options;
    this.settings = { ...this.settings, ...options.settings };
    if (options.useServerToken) {
      this.initializeConnectionWithServerToken();
    } else {
      if (!options.token) {
        throw new JodexError("Token is required when not using server-side token generation", "voice", "MISSING_TOKEN");
      }
      this.initializeConnection(options.url, options.token);
    }
  }
  /**
   * Initialize LiveKit connection
   */
  async initializeConnection(url, token) {
    try {
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      this.setupEventListeners();
      await this.room.connect(url, token);
      this.updateState({ isConnected: true });
    } catch (error) {
      const jodexError = this.handleError(error);
      this.updateState({ error: jodexError.message });
      this.onErrorCallbacks.forEach((cb) => cb(jodexError));
    }
  }
  /**
   * Initialize connection with server-side token generation
   */
  async initializeConnectionWithServerToken() {
    try {
      this.currentRoomName = this.options.roomName || "jodex-ai-room";
      this.currentParticipantName = this.options.participantName || "Jodex AI User";
      const token = await this.generateToken({
        roomName: this.currentRoomName,
        participantName: this.currentParticipantName,
        participantIdentity: this.options.participantIdentity
      });
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      this.setupEventListeners();
      this.setupTokenRefresh();
      await this.room.connect(this.options.url, token);
      this.updateState({ isConnected: true });
    } catch (error) {
      const jodexError = this.handleError(error);
      this.updateState({ error: jodexError.message });
      this.onErrorCallbacks.forEach((cb) => cb(jodexError));
    }
  }
  /**
   * Generate token from server
   */
  async generateToken(params) {
    const response = await fetch("/api/livekit/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new JodexError(
        errorData.error || "Failed to generate token",
        "voice",
        "TOKEN_GENERATION_FAILED"
      );
    }
    const data = await response.json();
    return data.token;
  }
  /**
   * Set up token refresh for long-lived sessions
   */
  setupTokenRefresh() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
    this.tokenRefreshInterval = setInterval(async () => {
      try {
        if (!this.room || !this.options.useServerToken) {
          return;
        }
        const newToken = await this.generateToken({
          roomName: this.currentRoomName,
          participantName: this.currentParticipantName,
          participantIdentity: this.options.participantIdentity
        });
        console.log("Token refresh completed (reconnection may be required for long sessions)");
      } catch (error) {
        console.error("Token refresh failed:", error);
      }
    }, 3e6);
  }
  /**
   * Set up LiveKit room event listeners
   */
  setupEventListeners() {
    if (!this.room) return;
    this.room.on("connected", () => {
      this.updateState({ isConnected: true });
    });
    this.room.on("disconnected", () => {
      this.updateState({
        isConnected: false,
        isRecording: false,
        isPlaying: false,
        isListening: false
      });
    });
    this.room.on("participantConnected", (participant) => {
      console.log("Participant connected:", participant.identity);
    });
    this.room.on("trackSubscribed", (track, publication, participant) => {
      if (track.kind === "audio") {
        this.remoteAudioTrack = track;
        track.attach();
      }
    });
    this.room.on("trackUnsubscribed", (track, publication, participant) => {
      if (track.kind === "audio") {
        track.detach();
        if (this.remoteAudioTrack === track) {
          this.remoteAudioTrack = null;
        }
      }
    });
  }
  /**
   * Start voice recording
   */
  async startRecording() {
    if (this.state.isRecording || !this.settings.enabled) {
      return;
    }
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);
      this.startVolumeMonitoring();
      if (this.room) {
        const publication = await this.room.localParticipant.publishTrack(this.mediaStream.getAudioTracks()[0], {
          name: "microphone"
        });
        this.localAudioTrack = publication.track;
      }
      this.updateState({
        isRecording: true,
        isListening: true,
        transcript: ""
      });
      this.startSpeechRecognition();
    } catch (error) {
      const jodexError = this.handleError(error);
      this.updateState({ error: jodexError.message });
      this.onErrorCallbacks.forEach((cb) => cb(jodexError));
    }
  }
  /**
   * Stop voice recording
   */
  async stopRecording() {
    if (!this.state.isRecording) {
      return;
    }
    try {
      this.stopVolumeMonitoring();
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }
      if (this.localAudioTrack && this.room) {
        await this.room.localParticipant.unpublishTrack(this.localAudioTrack);
        this.localAudioTrack = null;
      }
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
        this.analyser = null;
      }
      this.stopSpeechRecognition();
      this.updateState({
        isRecording: false,
        isListening: false,
        volume: 0
      });
    } catch (error) {
      const jodexError = this.handleError(error);
      this.updateState({ error: jodexError.message });
      this.onErrorCallbacks.forEach((cb) => cb(jodexError));
    }
  }
  /**
   * Start speech recognition
   */
  startSpeechRecognition() {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      console.warn("Speech recognition not supported in this browser");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = this.settings.language;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) {
        this.updateState({ transcript });
        this.onTranscriptCallbacks.forEach((cb) => cb(transcript));
      }
    };
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        const jodexError = new JodexError("Microphone permission denied", "voice", "MICROPHONE_DENIED");
        this.onErrorCallbacks.forEach((cb) => cb(jodexError));
      }
    };
    recognition.start();
  }
  /**
   * Stop speech recognition
   */
  stopSpeechRecognition() {
  }
  /**
   * Start volume monitoring
   */
  startVolumeMonitoring() {
    if (!this.analyser || this.isDestroyed) return;
    const checkVolume = () => {
      if (!this.analyser || !this.state.isRecording || this.isDestroyed) return;
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const volume = Math.min(100, average / 128 * 100);
      this.updateState({ volume });
      if (!this.isDestroyed) {
        this.volumeAnimationFrame = requestAnimationFrame(checkVolume);
      }
    };
    this.volumeAnimationFrame = requestAnimationFrame(checkVolume);
  }
  /**
   * Stop volume monitoring
   */
  stopVolumeMonitoring() {
    if (this.volumeAnimationFrame) {
      cancelAnimationFrame(this.volumeAnimationFrame);
      this.volumeAnimationFrame = null;
    }
  }
  /**
   * Speak text using text-to-speech
   */
  async speak(text) {
    if (!this.settings.enabled || !("speechSynthesis" in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.settings.language;
      utterance.rate = this.settings.rate;
      utterance.pitch = this.settings.pitch;
      return new Promise((resolve, reject) => {
        utterance.onend = () => {
          this.updateState({ isPlaying: false });
          resolve();
        };
        utterance.onerror = (error) => {
          this.updateState({ isPlaying: false });
          reject(new JodexError("Text-to-speech failed", "voice"));
        };
        this.updateState({ isPlaying: true });
        window.speechSynthesis.speak(utterance);
      });
    } catch (error) {
      const jodexError = this.handleError(error);
      this.updateState({ error: jodexError.message });
      this.onErrorCallbacks.forEach((cb) => cb(jodexError));
    }
  }
  /**
   * Stop text-to-speech
   */
  stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      this.updateState({ isPlaying: false });
    }
  }
  /**
   * Update voice settings
   */
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
  }
  /**
   * Get current voice state
   */
  getState() {
    return { ...this.state };
  }
  /**
   * Get current voice settings
   */
  getSettings() {
    return { ...this.settings };
  }
  /**
   * Add state change listener
   */
  onStateChange(callback) {
    this.onStateChangeCallbacks.push(callback);
  }
  /**
   * Add transcript listener
   */
  onTranscript(callback) {
    this.onTranscriptCallbacks.push(callback);
  }
  /**
   * Add error listener
   */
  onError(callback) {
    this.onErrorCallbacks.push(callback);
  }
  /**
   * Update internal state
   */
  updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.onStateChangeCallbacks.forEach((cb) => cb({ ...this.state }));
  }
  /**
   * Handle errors and convert to JodexError
   */
  handleError(error) {
    if (error instanceof JodexError) {
      return error;
    }
    const jodexError = new JodexError(error.message || "Voice connection error", "voice", "VOICE_ERROR");
    jodexError.details = error;
    return jodexError;
  }
  /**
   * Disconnect and clean up
   */
  async disconnect() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
    this.stopVolumeMonitoring();
    await this.stopRecording();
    this.stopSpeaking();
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.mediaStream = null;
    }
    if (this.localAudioTrack) {
      await this.localAudioTrack.stop();
      if ("dispose" in this.localAudioTrack && typeof this.localAudioTrack.dispose === "function") {
        await this.localAudioTrack.dispose();
      }
      this.localAudioTrack = null;
    }
    if (this.remoteAudioTrack) {
      this.remoteAudioTrack = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        await this.audioContext.close();
      } catch (error) {
        console.warn("Failed to close audio context:", error);
      }
      this.audioContext = null;
      this.analyser = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.onStateChangeCallbacks = [];
    this.onTranscriptCallbacks = [];
    this.onErrorCallbacks = [];
    this.state = {
      isRecording: false,
      isPlaying: false,
      isListening: false,
      transcript: "",
      volume: 0,
      isConnected: false,
      error: void 0
    };
  }
};

// src/lib/actions.ts
var ActionManager = class {
  constructor(onAction) {
    this.queue = [];
    this.isProcessing = false;
    this.onActionCallback = onAction;
  }
  /**
   * Add an action to the queue
   */
  addAction(action) {
    this.queue.push(action);
    this.processQueue();
  }
  /**
   * Process the action queue
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const action = this.queue.shift();
      if (action) {
        await this.executeAction(action);
      }
    }
    this.isProcessing = false;
  }
  /**
   * Execute a single action
   */
  async executeAction(action) {
    try {
      if (this.onActionCallback) {
        this.onActionCallback(action);
      }
      switch (action.type) {
        case "show_supply_forecast":
          this.handleSupplyForecast(action);
          break;
        case "show_farmer_list":
          this.handleFarmerList(action);
          break;
        case "show_weather_alerts":
          this.handleWeatherAlerts(action);
          break;
        case "show_disease_map":
          this.handleDiseaseMap(action);
          break;
        case "show_inventory":
          this.handleInventory(action);
          break;
        case "open_farmer_profile":
          this.handleFarmerProfile(action);
          break;
        case "send_notification":
          this.handleNotification(action);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error("Failed to execute action:", action, error);
    }
  }
  /**
   * Built-in handlers for common actions
   */
  handleSupplyForecast(action) {
    console.log("Showing supply forecast:", action.data);
  }
  handleFarmerList(action) {
    console.log("Showing farmer list:", action.data);
  }
  handleWeatherAlerts(action) {
    console.log("Showing weather alerts:", action.data);
  }
  handleDiseaseMap(action) {
    console.log("Showing disease map:", action.data);
  }
  handleInventory(action) {
    console.log("Showing inventory:", action.data);
  }
  handleFarmerProfile(action) {
    console.log("Opening farmer profile:", action.data);
  }
  handleNotification(action) {
    console.log("Sending notification:", action.data);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(action.data.title || "Jodex Alert", {
        body: action.data.message || action.data,
        icon: "/favicon.ico",
        tag: "jodex-notification"
      });
    }
  }
  /**
   * Clear all pending actions
   */
  clearQueue() {
    this.queue = [];
  }
  /**
   * Get the current queue status
   */
  getQueueStatus() {
    return {
      pending: this.queue.length,
      isProcessing: this.isProcessing
    };
  }
};
function validateAction(action) {
  return action && typeof action === "object" && typeof action.type === "string" && typeof action.data === "object" && typeof action.priority === "string" && typeof action.timestamp === "string" && ["critical", "high", "medium", "low"].includes(action.priority);
}
function createAction(type, data, priority = "medium") {
  return {
    type,
    data,
    priority,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
var ACTION_TYPES = {
  SHOW_SUPPLY_FORECAST: "show_supply_forecast",
  SHOW_FARMER_LIST: "show_farmer_list",
  SHOW_WEATHER_ALERTS: "show_weather_alerts",
  SHOW_DISEASE_MAP: "show_disease_map",
  SHOW_INVENTORY: "show_inventory",
  OPEN_FARMER_PROFILE: "open_farmer_profile",
  SEND_NOTIFICATION: "send_notification",
  CUSTOM: "custom"
};

// src/lib/storage.ts
var StorageManager = class {
  constructor(storageKey = "jodex-ai-assistant") {
    this.storageKey = storageKey;
    this.isLocalStorageAvailable = this.checkLocalStorageAvailability();
  }
  /**
   * Check if localStorage is available
   */
  checkLocalStorageAvailability() {
    try {
      const testKey = "__jodex_test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn("localStorage is not available:", error);
      return false;
    }
  }
  /**
   * Save data to storage
   */
  save(data) {
    if (!this.isLocalStorageAvailable) {
      console.warn("Cannot save to storage: localStorage not available");
      return;
    }
    try {
      const existingData = this.load();
      const updatedData = {
        ...existingData,
        ...data,
        lastActivity: (/* @__PURE__ */ new Date()).toISOString()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(updatedData));
    } catch (error) {
      console.error("Failed to save to storage:", error);
    }
  }
  /**
   * Load data from storage
   */
  load() {
    if (!this.isLocalStorageAvailable) {
      return this.getDefaultStorageData();
    }
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return this.getDefaultStorageData();
      }
      const data = JSON.parse(stored);
      if (data.messages) {
        data.messages = data.messages.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
      if (data.alerts) {
        data.alerts = data.alerts.map((alert) => ({
          ...alert,
          timestamp: new Date(alert.timestamp),
          snoozedUntil: alert.snoozedUntil ? new Date(alert.snoozedUntil) : void 0
        }));
      }
      return { ...this.getDefaultStorageData(), ...data };
    } catch (error) {
      console.error("Failed to load from storage:", error);
      return this.getDefaultStorageData();
    }
  }
  /**
   * Clear all stored data
   */
  clear() {
    if (!this.isLocalStorageAvailable) {
      return;
    }
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error("Failed to clear storage:", error);
    }
  }
  /**
   * Get default storage data
   */
  getDefaultStorageData() {
    return {
      messages: [],
      settings: {},
      voiceSettings: {},
      alerts: [],
      lastActivity: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Save messages
   */
  saveMessages(messages) {
    const limitedMessages = messages.slice(-100);
    this.save({ messages: limitedMessages });
  }
  /**
   * Load messages
   */
  loadMessages() {
    const data = this.load();
    return data.messages || [];
  }
  /**
   * Save settings
   */
  saveSettings(settings) {
    this.save({ settings });
  }
  /**
   * Load settings
   */
  loadSettings() {
    const data = this.load();
    return data.settings || {};
  }
  /**
   * Save voice settings
   */
  saveVoiceSettings(settings) {
    this.save({ voiceSettings: settings });
  }
  /**
   * Load voice settings
   */
  loadVoiceSettings() {
    const data = this.load();
    return data.voiceSettings || {};
  }
  /**
   * Save alerts
   */
  saveAlerts(alerts) {
    const validAlerts = alerts.filter((alert) => {
      if (alert.dismissed) return false;
      if (alert.snoozedUntil && /* @__PURE__ */ new Date() > alert.snoozedUntil) return false;
      const thirtyDaysAgo = /* @__PURE__ */ new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return alert.timestamp > thirtyDaysAgo;
    });
    this.save({ alerts: validAlerts });
  }
  /**
   * Load alerts
   */
  loadAlerts() {
    const data = this.load();
    return data.alerts || [];
  }
  /**
   * Get storage size
   */
  getStorageSize() {
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
  isStorageNearFull() {
    const size = this.getStorageSize();
    return size > 4 * 1024 * 1024;
  }
};
var MemoryStorage = class {
  constructor() {
    this.data = {
      messages: [],
      settings: {},
      voiceSettings: {},
      alerts: [],
      lastActivity: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  save(data) {
    this.data = {
      ...this.data,
      ...data,
      lastActivity: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  load() {
    return { ...this.data };
  }
  clear() {
    this.data = {
      messages: [],
      settings: {},
      voiceSettings: {},
      alerts: [],
      lastActivity: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};
function createStorageManager(storageKey = "jodex-ai-assistant") {
  try {
    const testKey = "__jodex_storage_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return new StorageManager(storageKey);
  } catch (error) {
    console.warn("Falling back to memory storage");
    return new MemoryStorage();
  }
}
var ChatInterface = ({
  messages,
  isLoading,
  onSendMessage,
  onCollapse,
  config,
  showHeader,
  showFooter,
  showTimestamps,
  voiceEnabled
}) => {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  const formatTimestamp = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  return /* @__PURE__ */ jsxs("div", { className: "jodex-chat-container", children: [
    showHeader && /* @__PURE__ */ jsxs("div", { className: "jodex-chat-header", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        config.logo ? /* @__PURE__ */ jsx("img", { src: config.logo, alt: "Jodex AI", className: "w-6 h-6" }) : /* @__PURE__ */ jsx("div", { className: "w-6 h-6 bg-green-500 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "text-white text-xs font-bold", children: "JD" }) }),
        /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-900 dark:text-gray-100", children: config.title })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsx("div", { className: "w-2 h-2 bg-green-500 rounded-full animate-pulse" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500 dark:text-gray-400", children: "Online" })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: onCollapse,
            className: "jodex-btn-icon",
            title: "Collapse chat",
            children: /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "jodex-chat-messages", children: [
      /* @__PURE__ */ jsx(AnimatePresence, { initial: false, children: messages.length === 0 ? /* @__PURE__ */ jsxs(
        motion.div,
        {
          className: "flex flex-col items-center justify-center h-full text-center p-8",
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -20 },
          children: [
            /* @__PURE__ */ jsx("div", { className: "w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4", children: /* @__PURE__ */ jsx("svg", { className: "w-6 h-6 text-green-600 dark:text-green-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" }) }) }),
            /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2", children: "Welcome to Jodex AI Assistant" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 max-w-sm", children: "I'm here to help you with agricultural supply chain management. Ask me about farmers, weather conditions, harvest data, or anything else related to your cacao operations." }),
            voiceEnabled && /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500 dark:text-gray-500 mt-4", children: "\u{1F4AC} You can also use voice input by clicking the microphone button" })
          ]
        }
      ) : messages.map((message, index) => /* @__PURE__ */ jsxs(
        motion.div,
        {
          className: `jodex-message jodex-message-${message.role}`,
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -20 },
          transition: { duration: 0.2, delay: index * 0.05 },
          children: [
            /* @__PURE__ */ jsx("div", { className: "jodex-message-avatar", children: message.role === "user" ? /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z", clipRule: "evenodd" }) }) : /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z", clipRule: "evenodd" }) }) }),
            /* @__PURE__ */ jsxs("div", { className: "jodex-message-content", children: [
              /* @__PURE__ */ jsx("div", { className: "jodex-message-text", children: message.isStreaming ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx("span", { children: message.content }),
                /* @__PURE__ */ jsxs("div", { className: "jodex-typing", children: [
                  /* @__PURE__ */ jsx("div", { className: "jodex-typing-dot" }),
                  /* @__PURE__ */ jsx("div", { className: "jodex-typing-dot" }),
                  /* @__PURE__ */ jsx("div", { className: "jodex-typing-dot" })
                ] })
              ] }) : message.content }),
              showTimestamps && /* @__PURE__ */ jsx("div", { className: "jodex-message-timestamp", children: formatTimestamp(message.timestamp) }),
              message.actions && message.actions.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: message.actions.map((action, actionIndex) => /* @__PURE__ */ jsxs(
                "div",
                {
                  className: "inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-md",
                  children: [
                    /* @__PURE__ */ jsx("svg", { className: "w-3 h-3", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }) }),
                    action.type.replace("_", " ")
                  ]
                },
                actionIndex
              )) })
            ] })
          ]
        },
        message.id
      )) }),
      isLoading && /* @__PURE__ */ jsxs(
        motion.div,
        {
          className: "jodex-message jodex-message-assistant",
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          children: [
            /* @__PURE__ */ jsx("div", { className: "jodex-message-avatar", children: /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z", clipRule: "evenodd" }) }) }),
            /* @__PURE__ */ jsx("div", { className: "jodex-message-content", children: /* @__PURE__ */ jsxs("div", { className: "jodex-typing", children: [
              /* @__PURE__ */ jsx("div", { className: "jodex-typing-dot" }),
              /* @__PURE__ */ jsx("div", { className: "jodex-typing-dot" }),
              /* @__PURE__ */ jsx("div", { className: "jodex-typing-dot" }),
              /* @__PURE__ */ jsx("span", { className: "ml-2 text-sm text-gray-500 dark:text-gray-400", children: "Jodex is thinking..." })
            ] }) })
          ]
        }
      ),
      /* @__PURE__ */ jsx("div", { ref: messagesEndRef })
    ] }),
    showFooter && /* @__PURE__ */ jsxs("div", { className: "jodex-chat-input-container", children: [
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "flex gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex-1 relative", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              ref: inputRef,
              type: "text",
              value: inputValue,
              onChange: (e) => setInputValue(e.target.value),
              onKeyDown: handleKeyDown,
              placeholder: "Ask about farmers, weather, or harvest data...",
              className: "jodex-input",
              disabled: isLoading,
              autoComplete: "off"
            }
          ),
          isLoading && /* @__PURE__ */ jsx("div", { className: "absolute right-3 top-1/2 -translate-y-1/2", children: /* @__PURE__ */ jsx("div", { className: "jodex-loading" }) })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            disabled: !inputValue.trim() || isLoading,
            className: "jodex-btn jodex-btn-primary",
            title: "Send message",
            children: /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8" }) })
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 text-xs text-gray-500 dark:text-gray-400 text-center", children: "Press Enter to send \u2022 Shift+Enter for new line" })
    ] })
  ] });
};
var VoiceInterface = ({
  voiceState,
  onToggleRecording,
  config,
  browserCompatibility
}) => {
  const getVolumeLevel = () => {
    if (voiceState.volume < 30) return "low";
    if (voiceState.volume < 70) return "medium";
    return "high";
  };
  const getButtonState = () => {
    if (browserCompatibility && !browserCompatibility.supported) return "disabled";
    if (!voiceState.isConnected || !config.theme) return "disabled";
    if (voiceState.isRecording) return "recording";
    if (voiceState.isPlaying) return "playing";
    if (voiceState.isListening) return "listening";
    return "idle";
  };
  const buttonState = getButtonState();
  const volumeLevel = getVolumeLevel();
  const handleKeyDown = useCallback((event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggleRecording();
    }
    if (event.key === "Escape" && (buttonState === "recording" || buttonState === "listening")) {
      event.preventDefault();
      onToggleRecording();
    }
  }, [onToggleRecording, buttonState]);
  return /* @__PURE__ */ jsxs("div", { className: "absolute bottom-6 right-6 z-10", role: "application", "aria-label": "Voice interface", children: [
    /* @__PURE__ */ jsxs(
      motion.button,
      {
        onClick: onToggleRecording,
        onKeyDown: handleKeyDown,
        className: `jodex-voice-btn jodex-voice-btn-${buttonState}`,
        disabled: buttonState === "disabled",
        whileHover: { scale: buttonState !== "disabled" ? 1.1 : 1 },
        whileTap: { scale: buttonState !== "disabled" ? 0.95 : 1 },
        tabIndex: buttonState === "disabled" ? -1 : 0,
        "aria-label": buttonState === "recording" ? "Stop recording voice input" : buttonState === "playing" ? "Stop text-to-speech playback" : buttonState === "listening" ? "Voice assistant is listening" : buttonState === "disabled" ? "Voice features are unavailable" : "Start voice input",
        "aria-pressed": buttonState === "recording" || buttonState === "listening",
        "aria-describedby": "voice-status",
        "aria-live": "polite",
        children: [
          (buttonState === "idle" || buttonState === "recording" || buttonState === "listening") && /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z", clipRule: "evenodd" }) }),
          buttonState === "playing" && /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z", clipRule: "evenodd" }) }),
          buttonState === "disabled" && /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z", clipRule: "evenodd" }) }),
          voiceState.isRecording && /* @__PURE__ */ jsx(
            "div",
            {
              className: `jodex-volume-indicator jodex-volume-${volumeLevel}`,
              role: "progressbar",
              "aria-valuenow": Math.round(voiceState.volume),
              "aria-valuemin": 0,
              "aria-valuemax": 100,
              "aria-label": `Voice input volume: ${Math.round(voiceState.volume)}%`
            }
          )
        ]
      }
    ),
    voiceState.isRecording && /* @__PURE__ */ jsxs(
      motion.div,
      {
        className: "absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap",
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        children: [
          "Recording... ",
          voiceState.volume > 0 && `(${Math.round(voiceState.volume)}%)`
        ]
      }
    ),
    voiceState.isPlaying && /* @__PURE__ */ jsx(
      motion.div,
      {
        className: "absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap",
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        children: "Speaking..."
      }
    ),
    voiceState.error && /* @__PURE__ */ jsx(
      motion.div,
      {
        className: "absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap max-w-32 text-center",
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        children: voiceState.error
      }
    ),
    voiceState.isListening && voiceState.transcript && /* @__PURE__ */ jsxs(
      motion.div,
      {
        className: "absolute bottom-16 right-0 left-auto w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-xs",
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        role: "status",
        "aria-live": "polite",
        "aria-label": "Voice transcript",
        children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1", children: "Listening:" }),
          /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-800 dark:text-gray-200 truncate", children: voiceState.transcript })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "sr-only", "aria-live": "assertive", "aria-atomic": "true", children: [
      voiceState.isRecording && "Recording voice input",
      voiceState.isPlaying && "Speaking response",
      voiceState.isListening && "Processing voice input",
      voiceState.error && `Voice error: ${voiceState.error}`
    ] }),
    /* @__PURE__ */ jsxs("div", { id: "voice-status", className: "sr-only", children: [
      "Voice interface status: ",
      buttonState,
      voiceState.isRecording && ` - Recording at ${Math.round(voiceState.volume)}% volume`,
      voiceState.transcript && ` - Transcript: ${voiceState.transcript}`
    ] })
  ] });
};
var AlertPanel = ({
  alerts,
  onAcknowledge,
  onDismiss
}) => {
  const visibleAlerts = alerts.filter((alert) => {
    if (alert.acknowledged) {
      const fiveSecondsAgo = new Date(Date.now() - 5e3);
      return alert.timestamp > fiveSecondsAgo;
    }
    return true;
  });
  const getAlertIcon = (type) => {
    switch (type) {
      case "weather":
        return /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { d: "M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" }) });
      case "disease":
        return /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z", clipRule: "evenodd" }) });
      case "supply":
        return /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { d: "M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" }) });
      case "inventory":
        return /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { d: "M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" }) });
      default:
        return /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z", clipRule: "evenodd" }) });
    }
  };
  const formatTimestamp = (date) => {
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 6e4);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };
  if (visibleAlerts.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsx("div", { className: "absolute top-4 left-4 right-4 z-10 pointer-events-none", children: /* @__PURE__ */ jsx(AnimatePresence, { children: visibleAlerts.map((alert) => /* @__PURE__ */ jsx(
    motion.div,
    {
      className: `jodex-alert jodex-alert-${alert.priority} pointer-events-auto mb-2 max-w-md mx-auto shadow-lg`,
      initial: { opacity: 0, y: -20, scale: 0.95 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -20, scale: 0.95 },
      transition: { duration: 0.2 },
      children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: `flex-shrink-0 mt-0.5 ${alert.priority === "critical" ? "text-red-500" : alert.priority === "high" ? "text-orange-500" : alert.priority === "medium" ? "text-yellow-500" : "text-blue-500"}`, children: getAlertIcon(alert.type) }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h4", { className: "font-semibold text-sm", children: alert.title }),
              /* @__PURE__ */ jsx("p", { className: "text-sm mt-1 opacity-90", children: alert.message })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 flex-shrink-0", children: [
              !alert.acknowledged && /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => onAcknowledge(alert.id),
                  className: "jodex-btn-icon",
                  title: "Acknowledge alert",
                  children: /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" }) })
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => onDismiss(alert.id),
                  className: "jodex-btn-icon",
                  title: "Dismiss alert",
                  children: /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z", clipRule: "evenodd" }) })
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mt-2 text-xs opacity-75", children: [
            /* @__PURE__ */ jsx("span", { children: formatTimestamp(alert.timestamp) }),
            alert.acknowledged && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsx("svg", { className: "w-3 h-3", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }) }),
              "Acknowledged"
            ] })
          ] }),
          alert.actions && alert.actions.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: alert.actions.map((action, index) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: "inline-flex items-center gap-1 px-2 py-1 bg-white/20 dark:bg-black/20 text-xs rounded-md",
              children: [
                /* @__PURE__ */ jsx("svg", { className: "w-3 h-3", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }) }),
                action.type.replace("_", " ")
              ]
            },
            index
          )) })
        ] })
      ] })
    },
    alert.id
  )) }) });
};
var NoSSR = ({ children, fallback = null }) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  if (!isMounted) {
    return /* @__PURE__ */ jsx(Fragment, { children: fallback });
  }
  return /* @__PURE__ */ jsx(Fragment, { children });
};
var ErrorBoundary = class extends Component {
  constructor(props) {
    super(props);
    this.retryCount = 0;
    this.maxRetries = 3;
    this.handleRetry = () => {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        this.setState({ hasError: false, error: void 0, errorInfo: void 0 });
      }
    };
    this.getErrorType = (error) => {
      if (!error) return "unknown";
      const message = error.message.toLowerCase();
      if (message.includes("network") || message.includes("fetch")) {
        return "network";
      }
      if (message.includes("voice") || message.includes("audio")) {
        return "voice";
      }
      if (message.includes("api") || message.includes("openai")) {
        return "api";
      }
      if (message.includes("permission") || message.includes("denied")) {
        return "permission";
      }
      return "general";
    };
    this.getErrorMessage = (error) => {
      const errorType = this.getErrorType(error);
      switch (errorType) {
        case "network":
          return "Network connection error. Please check your internet connection and try again.";
        case "voice":
          return "Voice features are unavailable. This might be due to browser limitations or missing permissions.";
        case "api":
          return "AI service temporarily unavailable. Please try again in a moment.";
        case "permission":
          return "Permission required. Please allow microphone access to use voice features.";
        default:
          return "An unexpected error occurred. Please refresh the page or try again.";
      }
    };
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
    console.error("Jodex AI Assistant Error Boundary:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      this.getErrorType(this.state.error);
      const canRetry = this.props.showRetry && this.retryCount < this.maxRetries;
      return /* @__PURE__ */ jsx(
        "div",
        {
          className: "jodex-error-boundary flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg",
          role: "alert",
          "aria-live": "assertive",
          children: /* @__PURE__ */ jsxs("div", { className: "text-center max-w-md", children: [
            /* @__PURE__ */ jsx("div", { className: "mb-4", children: /* @__PURE__ */ jsx(
              "svg",
              {
                className: "w-12 h-12 mx-auto text-red-500",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24",
                "aria-hidden": "true",
                children: /* @__PURE__ */ jsx(
                  "path",
                  {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  }
                )
              }
            ) }),
            /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-red-800 dark:text-red-200 mb-2", children: "Something went wrong" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-red-600 dark:text-red-300 mb-6", children: this.getErrorMessage(this.state.error) }),
            process.env.NODE_ENV === "development" && this.state.error && /* @__PURE__ */ jsxs("details", { className: "mb-4 text-left", children: [
              /* @__PURE__ */ jsx("summary", { className: "cursor-pointer text-xs text-red-500 hover:text-red-400", children: "Error details" }),
              /* @__PURE__ */ jsx("pre", { className: "mt-2 text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-auto max-h-32", children: /* @__PURE__ */ jsxs("code", { children: [
                this.state.error.toString(),
                this.state.errorInfo && "\n" + this.state.errorInfo.componentStack
              ] }) })
            ] }),
            canRetry && /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: this.handleRetry,
                className: "jodex-btn jodex-btn-primary text-sm",
                "aria-label": "Retry loading the component",
                children: [
                  "Try Again ",
                  this.retryCount > 0 && `(${this.maxRetries - this.retryCount} attempts left)`
                ]
              }
            ),
            this.retryCount >= this.maxRetries && /* @__PURE__ */ jsx("p", { className: "text-xs text-red-500 mt-2", children: "Maximum retry attempts reached. Please refresh the page." })
          ] })
        }
      );
    }
    return this.props.children;
  }
};

// src/lib/browser-compatibility.ts
function checkBrowserCompatibility() {
  const compatibility = {
    supported: false,
    features: {
      webAudio: false,
      mediaDevices: false,
      getUserMedia: false,
      webkitSpeechRecognition: false,
      speechRecognition: false,
      webRTC: false
    },
    browser: {
      name: "unknown",
      version: "unknown",
      isMobile: false
    },
    issues: []
  };
  try {
    if (typeof window === "undefined") {
      compatibility.issues.push("Not running in a browser environment");
      return compatibility;
    }
    const userAgent = navigator.userAgent;
    let browserName = "unknown";
    let browserVersion = "unknown";
    if (/Chrome/.test(userAgent) && !/Chromium|Edge|Edg|Opera|OPR\//.test(userAgent)) {
      browserName = "Chrome";
      const match = userAgent.match(/Chrome\/(\d+)/);
      browserVersion = match ? match[1] : "unknown";
    } else if (/Safari/.test(userAgent) && !/Chrome|Chromium|Edge|Edg|Opera|OPR\//.test(userAgent)) {
      browserName = "Safari";
      const match = userAgent.match(/Version\/(\d+)/);
      browserVersion = match ? match[1] : "unknown";
    } else if (/Firefox/.test(userAgent)) {
      browserName = "Firefox";
      const match = userAgent.match(/Firefox\/(\d+)/);
      browserVersion = match ? match[1] : "unknown";
    } else if (/Edge|Edg/.test(userAgent)) {
      browserName = "Edge";
      const match = userAgent.match(/(?:Edge|Edg)\/(\d+)/);
      browserVersion = match ? match[1] : "unknown";
    }
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    compatibility.browser = {
      name: browserName,
      version: browserVersion,
      isMobile
    };
    compatibility.features.webAudio = !!(window.AudioContext || window.webkitAudioContext);
    if (!compatibility.features.webAudio) {
      compatibility.issues.push("Web Audio API not supported");
    }
    compatibility.features.mediaDevices = !!navigator.mediaDevices;
    if (!compatibility.features.mediaDevices) {
      compatibility.issues.push("MediaDevices API not supported");
    }
    compatibility.features.getUserMedia = !!navigator.mediaDevices?.getUserMedia || !!navigator.getUserMedia || !!navigator.webkitGetUserMedia || !!navigator.mozGetUserMedia;
    if (!compatibility.features.getUserMedia) {
      compatibility.issues.push("getUserMedia not supported");
    }
    compatibility.features.speechRecognition = !!window.SpeechRecognition;
    compatibility.features.webkitSpeechRecognition = !!window.webkitSpeechRecognition;
    if (!compatibility.features.speechRecognition && !compatibility.features.webkitSpeechRecognition) {
      compatibility.issues.push("Speech Recognition not supported");
    }
    compatibility.features.webRTC = !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection || window.RTCPeerConnection);
    if (!compatibility.features.webRTC) {
      compatibility.issues.push("WebRTC not supported");
    }
    if (browserName === "Safari" && parseInt(browserVersion) < 14) {
      compatibility.issues.push("Safari version 14+ required for full voice support");
    }
    if (browserName === "Chrome" && parseInt(browserVersion) < 80) {
      compatibility.issues.push("Chrome version 80+ required for full voice support");
    }
    if (browserName === "Firefox" && parseInt(browserVersion) < 75) {
      compatibility.issues.push("Firefox version 75+ required for full voice support");
    }
    const hasCoreFeatures = compatibility.features.mediaDevices && compatibility.features.getUserMedia && (compatibility.features.speechRecognition || compatibility.features.webkitSpeechRecognition);
    const majorIssues = compatibility.issues.filter(
      (issue) => issue.includes("not supported") || issue.includes("required")
    ).length;
    compatibility.supported = hasCoreFeatures && majorIssues === 0;
  } catch (error) {
    compatibility.issues.push(`Error checking compatibility: ${error}`);
  }
  return compatibility;
}
var loadVoiceDependencies = async () => {
  const voiceDependencies = {
    motion: false,
    livekit: false
  };
  try {
    if (typeof window !== "undefined" && navigator.mediaDevices) {
      await import('framer-motion');
      voiceDependencies.motion = true;
      if (window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection) {
        await import('livekit-client');
        voiceDependencies.livekit = true;
      }
    }
  } catch (error) {
    console.warn("Failed to load voice dependencies:", error);
  }
  return voiceDependencies;
};
var DEFAULT_CONFIG = {
  position: "bottom-right",
  width: 384,
  height: 600,
  collapsed: false,
  showHeader: true,
  showFooter: true,
  showTimestamps: true,
  maxMessages: 50,
  animations: true,
  title: "Jodex AI Assistant"
};
var DEFAULT_THEME = {
  mode: "system",
  primaryColor: "#3b82f6",
  backgroundColor: void 0,
  textColor: void 0,
  borderColor: void 0,
  accentColor: void 0,
  customCSS: void 0
};
var useJodexStore = create((set, get) => ({
  // Initial state
  isConnected: false,
  isLoading: false,
  messages: [],
  voiceState: {
    isRecording: false,
    isPlaying: false,
    isListening: false,
    transcript: "",
    volume: 0,
    isConnected: false,
    error: void 0
  },
  alerts: [],
  config: { ...DEFAULT_CONFIG, theme: DEFAULT_THEME },
  error: void 0,
  // Actions
  setIsConnected: (connected) => set({ isConnected: connected }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages.slice(-(state.config.maxMessages || 50) + 1), message]
  })),
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map(
      (msg) => msg.id === id ? { ...msg, ...updates } : msg
    )
  })),
  setMessages: (messages) => set({ messages }),
  updateVoiceState: (updates) => set((state) => ({
    voiceState: { ...state.voiceState, ...updates }
  })),
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts].slice(0, 10)
    // Keep only last 10 alerts
  })),
  updateAlert: (id, updates) => set((state) => ({
    alerts: state.alerts.map(
      (alert) => alert.id === id ? { ...alert, ...updates } : alert
    )
  })),
  removeAlert: (id) => set((state) => ({
    alerts: state.alerts.filter((alert) => alert.id !== id)
  })),
  setConfig: (config) => set({ config }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: void 0 })
}));
var JodexAI = (props) => {
  const {
    apiUrl,
    apiKey,
    livekitUrl,
    livekitToken,
    systemPrompt,
    instructions,
    model = "gpt-4-turbo-preview",
    temperature = 0.7,
    maxTokens = 2e3,
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
    debugMode = false
  } = props;
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
    clearError
  } = useJodexStore();
  const openaiClientRef = useRef(null);
  const voiceConnectionRef = useRef(null);
  const actionManagerRef = useRef(null);
  const storageRef = useRef(null);
  const isInitializedRef = useRef(false);
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [voiceDependenciesLoaded, setVoiceDependenciesLoaded] = useState(false);
  const [browserCompatibility, setBrowserCompatibility] = useState(() => {
    if (typeof window !== "undefined") {
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
        webRTC: false
      },
      browser: {
        name: "unknown",
        version: "unknown",
        isMobile: false
      },
      issues: ["Server-side rendering"]
    };
  });
  const initialize = useCallback(async () => {
    if (isInitializedRef.current) return;
    try {
      setIsLoading(true);
      clearError();
      storageRef.current = createStorageManager("jodex-ai-assistant");
      const savedMessages = storageRef.current.loadMessages();
      if (savedMessages.length > 0) {
        setMessages(savedMessages);
      }
      openaiClientRef.current = new OpenAIClient({
        apiUrl,
        apiKey,
        // Fallback for backward compatibility
        systemPrompt,
        instructions,
        datasets,
        model,
        temperature,
        maxTokens,
        streaming
      });
      actionManagerRef.current = new ActionManager(onAction);
      if (voiceEnabled && livekitUrl) {
        try {
          voiceConnectionRef.current = new VoiceConnection({
            url: livekitUrl,
            roomName: "jodex-ai-room",
            participantName: "Jodex AI User",
            useServerToken: !livekitToken,
            // Use server-side token if no token provided
            token: livekitToken,
            // Use provided token if available (legacy mode)
            settings: voiceSettings
          });
          voiceConnectionRef.current.onStateChange((state) => {
            updateVoiceState(state);
          });
          voiceConnectionRef.current.onTranscript((transcript) => {
            if (transcript.trim()) {
              handleSendMessage(transcript);
            }
          });
          voiceConnectionRef.current.onError((error2) => {
            setError(error2.message);
            onError?.(error2);
          });
        } catch (voiceError) {
          console.warn("Voice initialization failed:", voiceError);
          if (debugMode) {
            console.error("Voice error details:", voiceError);
          }
        }
      }
      const finalConfig = {
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
        logo: logo || void 0,
        title,
        theme: currentTheme
      };
      setConfig(finalConfig);
      setIsConnected(true);
      setIsLoading(false);
      onReady?.();
    } catch (error2) {
      console.error("Initialization failed:", error2);
      const errorMessage = error2 instanceof Error ? error2.message : "Unknown error";
      setError(errorMessage);
      onError?.(error2);
      setIsLoading(false);
    }
    isInitializedRef.current = true;
  }, [
    apiKey,
    systemPrompt,
    instructions,
    datasets,
    model,
    temperature,
    maxTokens,
    streaming,
    voiceEnabled,
    livekitUrl,
    livekitToken,
    voiceSettings,
    onAction,
    onReady,
    onError,
    position,
    width,
    height,
    collapsed,
    showHeader,
    showFooter,
    showTimestamps,
    maxMessages,
    animations,
    logo,
    title,
    currentTheme,
    setIsLoading,
    clearError,
    setMessages,
    updateVoiceState,
    setError,
    setConfig,
    setIsConnected,
    addMessage,
    debugMode
  ]);
  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim() || !openaiClientRef.current || isLoading) {
      return;
    }
    let assistantMessage;
    try {
      setIsLoading(true);
      const userMessage = {
        id: `user-${Date.now()}`,
        content: content.trim(),
        role: "user",
        timestamp: /* @__PURE__ */ new Date()
      };
      addMessage(userMessage);
      onMessage?.(userMessage);
      assistantMessage = {
        id: `assistant-${Date.now()}`,
        content: "",
        role: "assistant",
        timestamp: /* @__PURE__ */ new Date(),
        isStreaming: true
      };
      addMessage(assistantMessage);
      if (streaming) {
        let fullContent = "";
        const stream = openaiClientRef.current.streamChatCompletion(messages);
        for await (const chunk of stream) {
          fullContent += chunk.content;
          updateMessage(assistantMessage.id, {
            content: fullContent,
            isStreaming: true
          });
          if (chunk.actions && chunk.actions.length > 0) {
            chunk.actions.forEach((action) => {
              actionManagerRef.current?.addAction(action);
            });
          }
        }
        updateMessage(assistantMessage.id, {
          content: fullContent,
          isStreaming: false
        });
      } else {
        const response = await openaiClientRef.current.chatCompletion(messages);
        updateMessage(assistantMessage.id, {
          content: response.content,
          isStreaming: false,
          actions: response.actions
        });
        if (response.actions && response.actions.length > 0) {
          response.actions.forEach((action) => {
            actionManagerRef.current?.addAction(action);
          });
        }
      }
      const finalAssistantMessage = {
        ...assistantMessage,
        content: assistantMessage.content,
        isStreaming: false
      };
      onMessage?.(finalAssistantMessage);
      if (storageRef.current) {
        storageRef.current.saveMessages([...messages, userMessage, finalAssistantMessage]);
      }
    } catch (error2) {
      console.error("Failed to send message:", error2);
      const errorMessage = error2 instanceof Error ? error2.message : "Unknown error";
      setError(errorMessage);
      onError?.(error2);
      setMessages(messages.filter((msg) => msg.id !== assistantMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [
    messages,
    isLoading,
    addMessage,
    updateMessage,
    setMessages,
    onMessage,
    onError,
    setError,
    setIsLoading,
    streaming
  ]);
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
    } catch (error2) {
      console.error("Failed to toggle recording:", error2);
      const errorMessage = error2 instanceof Error ? error2.message : "Voice recording failed";
      setError(errorMessage);
      onError?.(error2);
    }
  }, [voiceState.isRecording, onVoiceStart, onVoiceEnd, onError, setError]);
  const handleAlertAcknowledge = useCallback((alertId) => {
    updateAlert(alertId, { acknowledged: true });
    if (storageRef.current) {
      const currentAlerts = [...alerts];
      const updatedAlerts = currentAlerts.map(
        (alert) => alert.id === alertId ? { ...alert, acknowledged: true } : alert
      );
      storageRef.current.saveAlerts(updatedAlerts);
    }
  }, [alerts, updateAlert]);
  const handleAlertDismiss = useCallback((alertId) => {
    removeAlert(alertId);
    if (storageRef.current) {
      const updatedAlerts = alerts.filter((alert) => alert.id !== alertId);
      storageRef.current.saveAlerts(updatedAlerts);
    }
  }, [alerts, removeAlert]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const resolvedTheme = typeof theme === "string" ? { mode: theme } : theme;
    setCurrentTheme(resolvedTheme);
    const isDark = resolvedTheme.mode === "dark" || resolvedTheme.mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    if (resolvedTheme.customCSS) {
      const existingStyle = document.getElementById("jodex-custom-theme");
      if (existingStyle) {
        existingStyle.remove();
      }
      const style = document.createElement("style");
      style.id = "jodex-custom-theme";
      style.textContent = resolvedTheme.customCSS;
      document.head.appendChild(style);
    }
    return () => {
      const customStyle = document.getElementById("jodex-custom-theme");
      if (customStyle) {
        customStyle.remove();
      }
    };
  }, [theme]);
  useEffect(() => {
    if (voiceEnabled && typeof window !== "undefined") {
      loadVoiceDependencies().then((dependencies) => {
        setVoiceDependenciesLoaded(dependencies.motion);
      }).catch((error2) => {
        console.warn("Failed to load voice dependencies:", error2);
      });
    }
  }, [voiceEnabled]);
  useEffect(() => {
    initialize();
    return () => {
      voiceConnectionRef.current?.disconnect();
      isInitializedRef.current = false;
    };
  }, [initialize]);
  const renderChatInterface = () => {
    if (isCollapsed) {
      return /* @__PURE__ */ jsx(
        motion.div,
        {
          className: `jodex-collapsed jodex-position-${position}`,
          onClick: () => setIsCollapsed(false),
          whileHover: { scale: 1.05 },
          whileTap: { scale: 0.95 },
          children: logo ? /* @__PURE__ */ jsx("img", { src: logo, alt: "Jodex AI", className: "w-6 h-6" }) : /* @__PURE__ */ jsx("span", { className: "text-lg font-bold", children: "JD" })
        }
      );
    }
    return /* @__PURE__ */ jsxs(
      motion.div,
      {
        className: `jodex-chat-container jodex-position-${position} ${position === "fullscreen" ? "w-full h-full" : ""}`,
        style: {
          width: position !== "fullscreen" ? width : void 0,
          height: position !== "fullscreen" ? height : void 0
        },
        initial: animations ? { scale: 0.8, opacity: 0 } : void 0,
        animate: animations ? { scale: 1, opacity: 1 } : void 0,
        exit: animations ? { scale: 0.8, opacity: 0 } : void 0,
        transition: { duration: 0.2 },
        children: [
          /* @__PURE__ */ jsx(
            ChatInterface,
            {
              messages,
              isLoading,
              onSendMessage: handleSendMessage,
              onCollapse: () => setIsCollapsed(true),
              config,
              showHeader,
              showFooter,
              showTimestamps,
              voiceEnabled
            }
          ),
          voiceEnabled && voiceDependenciesLoaded && /* @__PURE__ */ jsx(NoSSR, { fallback: null, children: /* @__PURE__ */ jsx(
            VoiceInterface,
            {
              voiceState,
              onToggleRecording: handleToggleRecording,
              config,
              browserCompatibility
            }
          ) }),
          enableAlerts && alerts.length > 0 && /* @__PURE__ */ jsx(
            AlertPanel,
            {
              alerts,
              onAcknowledge: handleAlertAcknowledge,
              onDismiss: handleAlertDismiss
            }
          )
        ]
      }
    );
  };
  return /* @__PURE__ */ jsx(AnimatePresence, { children: /* @__PURE__ */ jsx("div", { className: "jodex-container", children: /* @__PURE__ */ jsxs(
    ErrorBoundary,
    {
      onError: (error2, errorInfo) => {
        console.error("Jodex AI Error:", error2, errorInfo);
        onError?.(error2);
      },
      showRetry: !debugMode,
      children: [
        renderChatInterface(),
        error && debugMode && /* @__PURE__ */ jsxs("div", { className: "fixed bottom-4 left-4 bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-sm z-[60]", children: [
          /* @__PURE__ */ jsx("strong", { children: "Error:" }),
          " ",
          error
        ] })
      ]
    }
  ) }) });
};
JodexAI.displayName = "JodexAI";

export { ACTION_TYPES, ActionManager, AlertPanel, ChatInterface, JodexAI, OpenAIClient, StorageManager, VoiceConnection, VoiceInterface, createAction, createStorageManager, validateAction };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map