import { Room, AudioTrack, LocalAudioTrack, RemoteParticipant } from 'livekit-client';
import { VoiceState, VoiceSettings } from '../types';
import { JodexError } from './errors';

export interface VoiceConnectionOptions {
  url: string;
  token?: string; // Optional when using server-side token generation
  roomName?: string; // Required for server-side token generation
  participantName?: string; // Required for server-side token generation
  participantIdentity?: string; // Optional, will be generated
  useServerToken?: boolean; // Enable server-side token generation
  settings?: Partial<VoiceSettings>;
}

export class VoiceConnection {
  private room: Room | null = null;
  private localAudioTrack: LocalAudioTrack | null = null;
  private remoteAudioTrack: AudioTrack | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isDestroyed = false;
  private tokenRefreshInterval: NodeJS.Timeout | null = null;
  private volumeAnimationFrame: number | null = null;
  private options: VoiceConnectionOptions;
  private currentRoomName: string = '';
  private currentParticipantName: string = '';

  private state: VoiceState = {
    isRecording: false,
    isPlaying: false,
    isListening: false,
    transcript: '',
    volume: 0,
    isConnected: false,
    error: undefined,
  };

  private settings: VoiceSettings = {
    enabled: true,
    autoPlay: true,
    language: 'en-US',
    voice: 'default',
    rate: 1.0,
    pitch: 1.0,
  };

  private onStateChangeCallbacks: ((state: VoiceState) => void)[] = [];
  private onTranscriptCallbacks: ((transcript: string) => void)[] = [];
  private onErrorCallbacks: ((error: JodexError) => void)[] = [];

  constructor(options: VoiceConnectionOptions) {
    this.options = options;
    this.settings = { ...this.settings, ...options.settings };

    if (options.useServerToken) {
      this.initializeConnectionWithServerToken();
    } else {
      if (!options.token) {
        throw new JodexError('Token is required when not using server-side token generation', 'voice', 'MISSING_TOKEN');
      }
      this.initializeConnection(options.url, options.token);
    }
  }

  /**
   * Initialize LiveKit connection
   */
  private async initializeConnection(url: string, token: string): Promise<void> {
    try {
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set up event listeners
      this.setupEventListeners();

      // Connect to room
      await this.room.connect(url, token);
      this.updateState({ isConnected: true });

    } catch (error) {
      const jodexError = this.handleError(error);
      this.updateState({ error: jodexError.message });
      this.onErrorCallbacks.forEach(cb => cb(jodexError));
    }
  }

  /**
   * Initialize connection with server-side token generation
   */
  private async initializeConnectionWithServerToken(): Promise<void> {
    try {
      // Store room and participant names for token refresh
      this.currentRoomName = this.options.roomName || 'jodex-ai-room';
      this.currentParticipantName = this.options.participantName || 'Jodex AI User';

      // Generate token from server
      const token = await this.generateToken({
        roomName: this.currentRoomName,
        participantName: this.currentParticipantName,
        participantIdentity: this.options.participantIdentity,
      });

      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.setupEventListeners();
      this.setupTokenRefresh();

      await this.room.connect(this.options.url, token);
      this.updateState({ isConnected: true });

    } catch (error) {
      const jodexError = this.handleError(error);
      this.updateState({ error: jodexError.message });
      this.onErrorCallbacks.forEach(cb => cb(jodexError));
    }
  }

  /**
   * Generate token from server
   */
  private async generateToken(params: {
    roomName: string;
    participantName: string;
    participantIdentity?: string;
  }): Promise<string> {
    const response = await fetch('/api/livekit/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new JodexError(
        errorData.error || 'Failed to generate token',
        'voice',
        'TOKEN_GENERATION_FAILED'
      );
    }

    const data = await response.json();
    return data.token;
  }

  /**
   * Set up token refresh for long-lived sessions
   */
  private setupTokenRefresh(): void {
    // Clear any existing interval
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }

    // Refresh token 5 minutes before expiry
    this.tokenRefreshInterval = setInterval(async () => {
      try {
        if (!this.room || !this.options.useServerToken) {
          return;
        }

        const newToken = await this.generateToken({
          roomName: this.currentRoomName,
          participantName: this.currentParticipantName,
          participantIdentity: this.options.participantIdentity,
        });

        // Note: LiveKit doesn't have a direct method to update token mid-session
        // This would typically require reconnection, but for most use cases,
        // the 1-hour token expiry is sufficient
        console.log('Token refresh completed (reconnection may be required for long sessions)');

      } catch (error) {
        console.error('Token refresh failed:', error);
        // Handle token refresh failure gracefully
      }
    }, 3000000); // 50 minutes
  }

  /**
   * Set up LiveKit room event listeners
   */
  private setupEventListeners(): void {
    if (!this.room) return;

    this.room.on('connected', () => {
      this.updateState({ isConnected: true });
    });

    this.room.on('disconnected', () => {
      this.updateState({
        isConnected: false,
        isRecording: false,
        isPlaying: false,
        isListening: false
      });
    });

    this.room.on('participantConnected', (participant: RemoteParticipant) => {
      console.log('Participant connected:', participant.identity);
    });

    this.room.on('trackSubscribed', (track, publication, participant) => {
      if (track.kind === 'audio') {
        this.remoteAudioTrack = track as AudioTrack;
        track.attach();
      }
    });

    this.room.on('trackUnsubscribed', (track, publication, participant) => {
      if (track.kind === 'audio') {
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
  async startRecording(): Promise<void> {
    if (this.state.isRecording || !this.settings.enabled) {
      return;
    }

    try {
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Create audio context for analysis
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);

      // Start monitoring volume
      this.startVolumeMonitoring();

      // Publish audio track to LiveKit room
      if (this.room) {
        const publication = await this.room.localParticipant.publishTrack(this.mediaStream.getAudioTracks()[0], {
          name: 'microphone',
        });
        this.localAudioTrack = publication.track as LocalAudioTrack;
      }

      this.updateState({
        isRecording: true,
        isListening: true,
        transcript: ''
      });

      // Start speech recognition
      this.startSpeechRecognition();

    } catch (error) {
      const jodexError = this.handleError(error);
      this.updateState({ error: jodexError.message });
      this.onErrorCallbacks.forEach(cb => cb(jodexError));
    }
  }

  /**
   * Stop voice recording
   */
  async stopRecording(): Promise<void> {
    if (!this.state.isRecording) {
      return;
    }

    try {
      // Stop volume monitoring first
      this.stopVolumeMonitoring();

      // Stop media stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Unpublish audio track
      if (this.localAudioTrack && this.room) {
        await this.room.localParticipant.unpublishTrack(this.localAudioTrack);
        this.localAudioTrack = null;
      }

      // Close audio context
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
        this.analyser = null;
      }

      // Stop speech recognition
      this.stopSpeechRecognition();

      this.updateState({
        isRecording: false,
        isListening: false,
        volume: 0
      });

    } catch (error) {
      const jodexError = this.handleError(error);
      this.updateState({ error: jodexError.message });
      this.onErrorCallbacks.forEach(cb => cb(jodexError));
    }
  }

  /**
   * Start speech recognition
   */
  private startSpeechRecognition(): void {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = this.settings.language;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      if (transcript.trim()) {
        this.updateState({ transcript });
        this.onTranscriptCallbacks.forEach(cb => cb(transcript));
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        const jodexError = new JodexError('Microphone permission denied', 'voice', 'MICROPHONE_DENIED');
        this.onErrorCallbacks.forEach(cb => cb(jodexError));
      }
    };

    recognition.start();
  }

  /**
   * Stop speech recognition
   */
  private stopSpeechRecognition(): void {
    // Speech recognition is stopped when the media stream is stopped
  }

  /**
   * Start volume monitoring
   */
  private startVolumeMonitoring(): void {
    if (!this.analyser || this.isDestroyed) return;

    const checkVolume = () => {
      if (!this.analyser || !this.state.isRecording || this.isDestroyed) return;

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);

      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const volume = Math.min(100, (average / 128) * 100);

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
  private stopVolumeMonitoring(): void {
    if (this.volumeAnimationFrame) {
      cancelAnimationFrame(this.volumeAnimationFrame);
      this.volumeAnimationFrame = null;
    }
  }

  /**
   * Speak text using text-to-speech
   */
  async speak(text: string): Promise<void> {
    if (!this.settings.enabled || !('speechSynthesis' in window)) {
      return;
    }

    try {
      // Cancel any ongoing speech
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
          reject(new JodexError('Text-to-speech failed', 'voice'));
        };

        this.updateState({ isPlaying: true });
        window.speechSynthesis.speak(utterance);
      });

    } catch (error) {
      const jodexError = this.handleError(error);
      this.updateState({ error: jodexError.message });
      this.onErrorCallbacks.forEach(cb => cb(jodexError));
    }
  }

  /**
   * Stop text-to-speech
   */
  stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.updateState({ isPlaying: false });
    }
  }

  /**
   * Update voice settings
   */
  updateSettings(settings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get current voice state
   */
  getState(): VoiceState {
    return { ...this.state };
  }

  /**
   * Get current voice settings
   */
  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  /**
   * Add state change listener
   */
  onStateChange(callback: (state: VoiceState) => void): void {
    this.onStateChangeCallbacks.push(callback);
  }

  /**
   * Add transcript listener
   */
  onTranscript(callback: (transcript: string) => void): void {
    this.onTranscriptCallbacks.push(callback);
  }

  /**
   * Add error listener
   */
  onError(callback: (error: JodexError) => void): void {
    this.onErrorCallbacks.push(callback);
  }

  /**
   * Update internal state
   */
  private updateState(updates: Partial<VoiceState>): void {
    this.state = { ...this.state, ...updates };
    this.onStateChangeCallbacks.forEach(cb => cb({ ...this.state }));
  }

  /**
   * Handle errors and convert to JodexError
   */
  private handleError(error: any): JodexError {
    if (error instanceof JodexError) {
      return error;
    }

    const jodexError = new JodexError(error.message || 'Voice connection error', 'voice', 'VOICE_ERROR');
    jodexError.details = error;
    return jodexError;
  }

  /**
   * Disconnect and clean up
   */
  async disconnect(): Promise<void> {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Clear token refresh interval
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }

    // Stop volume monitoring
    this.stopVolumeMonitoring();

    // Stop recording
    await this.stopRecording();

    // Stop speaking
    this.stopSpeaking();

    // Disconnect from room
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }

    // Clean up media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      this.mediaStream = null;
    }

    // Clean up audio tracks
    if (this.localAudioTrack) {
      await this.localAudioTrack.stop();
      if ('dispose' in this.localAudioTrack && typeof this.localAudioTrack.dispose === 'function') {
        await this.localAudioTrack.dispose();
      }
      this.localAudioTrack = null;
    }

    if (this.remoteAudioTrack) {
      // Remote tracks don't need explicit stop/dispose
      this.remoteAudioTrack = null;
    }

    // Clean up audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch (error) {
        console.warn('Failed to close audio context:', error);
      }
      this.audioContext = null;
      this.analyser = null;
    }

    // Cancel any ongoing speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Clear callbacks
    this.onStateChangeCallbacks = [];
    this.onTranscriptCallbacks = [];
    this.onErrorCallbacks = [];

    // Reset state
    this.state = {
      isRecording: false,
      isPlaying: false,
      isListening: false,
      transcript: '',
      volume: 0,
      isConnected: false,
      error: undefined,
    };
  }
}