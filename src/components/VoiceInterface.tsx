import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { VoiceState, UIConfig } from '../types';
import { BrowserCompatibility } from '../lib/browser-compatibility';

interface VoiceInterfaceProps {
  voiceState: VoiceState;
  onToggleRecording: () => void;
  config: UIConfig;
  browserCompatibility?: BrowserCompatibility;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  voiceState,
  onToggleRecording,
  config,
  browserCompatibility,
}) => {
  const getVolumeLevel = () => {
    if (voiceState.volume < 30) return 'low';
    if (voiceState.volume < 70) return 'medium';
    return 'high';
  };

  const getButtonState = () => {
    // Check browser compatibility first
    if (browserCompatibility && !browserCompatibility.supported) return 'disabled';
    if (!voiceState.isConnected || !config.theme) return 'disabled';
    if (voiceState.isRecording) return 'recording';
    if (voiceState.isPlaying) return 'playing';
    if (voiceState.isListening) return 'listening';
    return 'idle';
  };

  const buttonState = getButtonState();
  const volumeLevel = getVolumeLevel();

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Support keyboard activation
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggleRecording();
    }
    // Escape key to stop recording
    if (event.key === 'Escape' && (buttonState === 'recording' || buttonState === 'listening')) {
      event.preventDefault();
      onToggleRecording();
    }
  }, [onToggleRecording, buttonState]);

  return (
    <div className="absolute bottom-6 right-6 z-10" role="application" aria-label="Voice interface">
      <motion.button
        onClick={onToggleRecording}
        onKeyDown={handleKeyDown}
        className={`jodex-voice-btn jodex-voice-btn-${buttonState}`}
        disabled={buttonState === 'disabled'}
        whileHover={{ scale: buttonState !== 'disabled' ? 1.1 : 1 }}
        whileTap={{ scale: buttonState !== 'disabled' ? 0.95 : 1 }}
        tabIndex={buttonState === 'disabled' ? -1 : 0}
        aria-label={
          buttonState === 'recording'
            ? 'Stop recording voice input'
            : buttonState === 'playing'
            ? 'Stop text-to-speech playback'
            : buttonState === 'listening'
            ? 'Voice assistant is listening'
            : buttonState === 'disabled'
            ? 'Voice features are unavailable'
            : 'Start voice input'
        }
        aria-pressed={buttonState === 'recording' || buttonState === 'listening'}
        aria-describedby="voice-status"
        aria-live="polite"
      >
        {/* Microphone icon for recording/listening */}
        {(buttonState === 'idle' || buttonState === 'recording' || buttonState === 'listening') && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        )}

        {/* Stop icon for playing */}
        {buttonState === 'playing' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
        )}

        {/* Disabled icon */}
        {buttonState === 'disabled' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
        )}

        {/* Volume indicator for recording */}
        {voiceState.isRecording && (
          <div
            className={`jodex-volume-indicator jodex-volume-${volumeLevel}`}
            role="progressbar"
            aria-valuenow={Math.round(voiceState.volume)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Voice input volume: ${Math.round(voiceState.volume)}%`}
          />
        )}
      </motion.button>

      {/* Voice status text */}
      {voiceState.isRecording && (
        <motion.div
          className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Recording... {voiceState.volume > 0 && `(${Math.round(voiceState.volume)}%)`}
        </motion.div>
      )}

      {voiceState.isPlaying && (
        <motion.div
          className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Speaking...
        </motion.div>
      )}

      {voiceState.error && (
        <motion.div
          className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap max-w-32 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {voiceState.error}
        </motion.div>
      )}

      {/* Transcript preview (when listening) */}
      {voiceState.isListening && voiceState.transcript && (
        <motion.div
          className="absolute bottom-16 right-0 left-auto w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-xs"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          aria-live="polite"
          aria-label="Voice transcript"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Listening:
          </div>
          <div className="text-sm text-gray-800 dark:text-gray-200 truncate">
            {voiceState.transcript}
          </div>
        </motion.div>
      )}

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {voiceState.isRecording && 'Recording voice input'}
        {voiceState.isPlaying && 'Speaking response'}
        {voiceState.isListening && 'Processing voice input'}
        {voiceState.error && `Voice error: ${voiceState.error}`}
      </div>

      {/* Voice status description for screen readers */}
      <div id="voice-status" className="sr-only">
        Voice interface status: {buttonState}
        {voiceState.isRecording && ` - Recording at ${Math.round(voiceState.volume)}% volume`}
        {voiceState.transcript && ` - Transcript: ${voiceState.transcript}`}
      </div>
    </div>
  );
};