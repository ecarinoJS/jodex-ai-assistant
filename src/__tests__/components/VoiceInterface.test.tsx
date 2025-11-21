import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoiceInterface } from '../../components/VoiceInterface';
import type { VoiceInterfaceProps, VoiceState } from '../../types';

// Mock dependencies
vi.mock('../../lib/livekit', () => ({
  VoiceConnection: vi.fn().mockImplementation((config) => {
    const mockVoiceConnection = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      startRecording: vi.fn().mockImplementation(async () => {
        if (mockVoiceConnection.isSimulatingError) {
          throw new Error('Simulated recording error');
        }
      }),
      stopRecording: vi.fn().mockImplementation(async () => {
        if (mockVoiceConnection.isSimulatingError) {
          throw new Error('Simulated stop error');
        }
        return {
          transcript: 'Test transcript',
          duration: 5000,
        };
      }),
      isConnected: false,
      isRecording: false,
      isSupported: true,
      isMicrophoneEnabled: true,
      volume: 0,
      onStateChanged: vi.fn(),
      onTranscriptReceived: vi.fn(),
      onError: vi.fn(),
      isSimulatingError: false,
    };

    // Simulate state changes
    mockVoiceConnection.connect = vi.fn().mockImplementation(async () => {
      mockVoiceConnection.isConnected = true;
      if (mockVoiceConnection.onStateChanged) {
        mockVoiceConnection.onStateChanged({
          isConnected: true,
          isRecording: false,
          isSpeaking: false,
          volume: 0,
        });
      }
    });

    mockVoiceConnection.startRecording = vi.fn().mockImplementation(async () => {
      mockVoiceConnection.isRecording = true;
      mockVoiceConnection.isMicrophoneEnabled = true;
      if (mockVoiceConnection.onStateChanged) {
        mockVoiceConnection.onStateChanged({
          isConnected: true,
          isRecording: true,
          isSpeaking: false,
          volume: 0,
        });
      }
    });

    mockVoiceConnection.stopRecording = vi.fn().mockImplementation(async () => {
      mockVoiceConnection.isRecording = false;
      if (mockVoiceConnection.onTranscriptReceived) {
        mockVoiceConnection.onTranscriptReceived({
          transcript: 'Test transcript',
          duration: 5000,
        });
      }
      if (mockVoiceConnection.onStateChanged) {
        mockVoiceConnection.onStateChanged({
          isConnected: true,
          isRecording: false,
          isSpeaking: false,
          volume: 0,
        });
      }
      return {
        transcript: 'Test transcript',
        duration: 5000,
      };
    });

    mockVoiceConnection.disconnect = vi.fn().mockImplementation(async () => {
      mockVoiceConnection.isConnected = false;
      mockVoiceConnection.isRecording = false;
      if (mockVoiceConnection.onStateChanged) {
        mockVoiceConnection.onStateChanged({
          isConnected: false,
          isRecording: false,
          isSpeaking: false,
          volume: 0,
        });
      }
    });

    return mockVoiceConnection;
  }),
}));

// Mock MediaRecorder API
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  state: 'inactive',
  stream: null,
  ondataavailable: null,
  onstart: null,
  onstop: null,
  onerror: null,
};

Object.defineProperty(global, 'MediaRecorder', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockMediaRecorder),
});

// Mock getUserMedia
const mockGetUserMedia = vi.fn().mockResolvedValue({
  getAudioTracks: () => [{ enabled: true, stop: vi.fn() }],
  getVideoTracks: () => [],
});

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

// Mock Speech Synthesis API
const mockSpeechSynthesisUtterance = {
  text: '',
  lang: '',
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1,
  onstart: null,
  onend: null,
  onerror: null,
};

Object.defineProperty(global, 'SpeechSynthesisUtterance', {
  writable: true,
  value: vi.fn().mockImplementation((text) => ({
    ...mockSpeechSynthesisUtterance,
    text,
  })),
});

const mockSpeechSynthesis = {
  speak: vi.fn().mockImplementation((utterance) => {
    setTimeout(() => {
      if (utterance.onstart) utterance.onstart();
      setTimeout(() => {
        if (utterance.onend) utterance.onend();
      }, 100);
    }, 10);
  }),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn().mockReturnValue([]),
  onvoiceschanged: null,
};

Object.defineProperty(global, 'speechSynthesis', {
  writable: true,
  value: mockSpeechSynthesis,
});

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('VoiceInterface Component', () => {
  // Test data
  const defaultProps: VoiceInterfaceProps = {
    livekitUrl: 'wss://livekit.example.com',
    livekitToken: 'test-token',
    roomName: 'test-room',
    participantName: 'Test User',
    onTranscript: vi.fn(),
    onRecordingStateChange: vi.fn(),
    onConnectionStateChange: vi.fn(),
    onError: vi.fn(),
    disabled: false,
    showSettings: true,
    language: 'en-US',
    autoRecord: false,
    showVolumeIndicator: true,
    showRecordingIndicator: true,
    enableSpeechSynthesis: true,
  };

  const mockVoiceState: VoiceState = {
    isConnected: false,
    isRecording: false,
    isSpeaking: false,
    volume: 0.5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMediaRecorder.state = 'inactive';
    mockMediaRecorder.ondataavailable = null;
    mockMediaRecorder.onstart = null;
    mockMediaRecorder.onstop = null;
    mockMediaRecorder.onerror = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<VoiceInterface {...defaultProps} />);
      expect(screen.getByRole('button', { name: /microphone/i })).toBeInTheDocument();
    });

    it('should render in disabled state', () => {
      render(<VoiceInterface {...defaultProps} disabled={true} />);
      expect(screen.getByRole('button', { name: /microphone/i })).toBeDisabled();
    });

    it('should render settings panel when enabled', () => {
      render(<VoiceInterface {...defaultProps} showSettings={true} />);
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    });

    it('should hide settings panel when disabled', () => {
      render(<VoiceInterface {...defaultProps} showSettings={false} />);
      expect(screen.queryByRole('button', { name: /settings/i })).not.toBeInTheDocument();
    });

    it('should render volume indicator when enabled', () => {
      render(<VoiceInterface {...defaultProps} showVolumeIndicator={true} />);
      expect(screen.getByRole('progressbar', { name: /volume/i })).toBeInTheDocument();
    });

    it('should hide volume indicator when disabled', () => {
      render(<VoiceInterface {...defaultProps} showVolumeIndicator={false} />);
      expect(screen.queryByRole('progressbar', { name: /volume/i })).not.toBeInTheDocument();
    });
  });

  describe('Voice Connection', () => {
    it('should initialize voice connection on mount', async () => {
      const { VoiceConnection } = await import('../../lib/livekit');

      render(<VoiceInterface {...defaultProps} />);

      await waitFor(() => {
        expect(VoiceConnection).toHaveBeenCalledWith({
          livekitUrl: 'wss://livekit.example.com',
          token: 'test-token',
          roomName: 'test-room',
          participantName: 'Test User',
        });
      });
    });

    it('should connect to voice service when start button is clicked', async () => {
      const user = userEvent.setup();
      const { VoiceConnection } = await import('../../lib/livekit');

      render(<VoiceInterface {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      await waitFor(() => {
        const mockConnection = vi.mocked(VoiceConnection).mock.results[0].value;
        expect(mockConnection.connect).toHaveBeenCalled();
      });
    });

    it('should disconnect from voice service when stop button is clicked', async () => {
      const user = userEvent.setup();
      const { VoiceConnection } = await import('../../lib/livekit');

      render(<VoiceInterface {...defaultProps} />);

      // First connect
      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      // Then disconnect
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /disconnect/i })).toBeInTheDocument();
      });

      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      await user.click(disconnectButton);

      await waitFor(() => {
        const mockConnection = vi.mocked(VoiceConnection).mock.results[0].value;
        expect(mockConnection.disconnect).toHaveBeenCalled();
      });
    });

    it('should handle connection errors gracefully', async () => {
      const user = userEvent.setup();
      const { VoiceConnection } = await import('../../lib/livekit');

      // Mock connection error
      vi.mocked(VoiceConnection).mockImplementation(() => ({
        connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: vi.fn(),
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        isConnected: false,
        isRecording: false,
        isSupported: true,
        isMicrophoneEnabled: true,
        volume: 0,
        onStateChanged: vi.fn(),
        onTranscriptReceived: vi.fn(),
        onError: vi.fn(),
      }));

      render(<VoiceInterface {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Recording Control', () => {
    it('should start recording when microphone button is clicked', async () => {
      const user = userEvent.setup();
      const { VoiceConnection } = await import('../../lib/livekit');

      render(<VoiceInterface {...defaultProps} />);

      // Connect first
      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      // Then start recording
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /microphone/i })).toBeInTheDocument();
      });

      const recordButton = screen.getByRole('button', { name: /microphone/i });
      await user.click(recordButton);

      await waitFor(() => {
        const mockConnection = vi.mocked(VoiceConnection).mock.results[0].value;
        expect(mockConnection.startRecording).toHaveBeenCalled();
      });
    });

    it('should stop recording when recording button is clicked again', async () => {
      const user = userEvent.setup();
      const { VoiceConnection } = await import('../../lib/livekit');

      render(<VoiceInterface {...defaultProps} />);

      // Connect and start recording
      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /microphone/i })).toBeInTheDocument();
      });

      const recordButton = screen.getByRole('button', { name: /microphone/i });
      await user.click(recordButton);

      // Stop recording
      await user.click(recordButton);

      await waitFor(() => {
        const mockConnection = vi.mocked(VoiceConnection).mock.results[0].value;
        expect(mockConnection.stopRecording).toHaveBeenCalled();
      });
    });

    it('should show recording indicator when recording', async () => {
      const user = userEvent.setup();
      const { VoiceConnection } = await import('../../lib/livekit');

      render(<VoiceInterface {...defaultProps} />);

      // Connect and start recording
      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      const recordButton = screen.getByRole('button', { name: /microphone/i });
      await user.click(recordButton);

      await waitFor(() => {
        expect(screen.getByText(/recording/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
      });
    });

    it('should hide recording indicator when not recording', async () => {
      render(<VoiceInterface {...defaultProps} />);

      expect(screen.queryByText(/recording/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /stop recording/i })).not.toBeInTheDocument();
    });
  });

  describe('Auto Recording', () => {
    it('should start recording automatically when enabled', async () => {
      const user = userEvent.setup();
      const { VoiceConnection } = await import('../../lib/livekit');

      render(<VoiceInterface {...defaultProps} autoRecord={true} />);

      // Connect should auto-start recording
      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      await waitFor(() => {
        const mockConnection = vi.mocked(VoiceConnection).mock.results[0].value;
        expect(mockConnection.startRecording).toHaveBeenCalled();
      });
    });

    it('should not auto-start recording when disabled', async () => {
      const user = userEvent.setup();
      const { VoiceConnection } = await import('../../lib/livekit');

      render(<VoiceInterface {...defaultProps} autoRecord={false} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      await waitFor(() => {
        const mockConnection = vi.mocked(VoiceConnection).mock.results[0].value;
        expect(mockConnection.startRecording).not.toHaveBeenCalled();
      });
    });
  });

  describe('Transcript Handling', () => {
    it('should call onTranscript when transcript is received', async () => {
      const user = userEvent.setup();
      const mockOnTranscript = vi.fn();

      render(<VoiceInterface {...defaultProps} onTranscript={mockOnTranscript} />);

      // Connect and start recording
      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      const recordButton = screen.getByRole('button', { name: /microphone/i });
      await user.click(recordButton);

      // Stop recording to trigger transcript
      await user.click(recordButton);

      await waitFor(() => {
        expect(mockOnTranscript).toHaveBeenCalledWith({
          transcript: 'Test transcript',
          duration: 5000,
        });
      });
    });

    it('should display transcript when received', async () => {
      const user = userEvent.setup();

      render(<VoiceInterface {...defaultProps} />);

      // Connect and start recording
      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      const recordButton = screen.getByRole('button', { name: /microphone/i });
      await user.click(recordButton);

      // Stop recording to trigger transcript display
      await user.click(recordButton);

      await waitFor(() => {
        expect(screen.getByText('Test transcript')).toBeInTheDocument();
      });
    });

    it('should clear transcript when new recording starts', async () => {
      const user = userEvent.setup();

      render(<VoiceInterface {...defaultProps} />);

      // First recording
      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      const recordButton = screen.getByRole('button', { name: /microphone/i });
      await user.click(recordButton);
      await user.click(recordButton);

      await waitFor(() => {
        expect(screen.getByText('Test transcript')).toBeInTheDocument();
      });

      // Second recording should clear previous transcript
      await user.click(recordButton);

      await waitFor(() => {
        expect(screen.queryByText('Test transcript')).not.toBeInTheDocument();
      });
    });
  });

  describe('Volume Indicator', () => {
    it('should display current volume level', async () => {
      const { VoiceConnection } = await import('../../lib/livekit');

      const mockConnection = vi.mocked(VoiceConnection).mock.results[0].value;
      mockConnection.volume = 0.75;

      render(<VoiceInterface {...defaultProps} showVolumeIndicator={true} />);

      await waitFor(() => {
        const volumeBar = screen.getByRole('progressbar', { name: /volume/i });
        expect(volumeBar).toHaveAttribute('aria-valuenow', '0.75');
      });
    });

    it('should update volume when level changes', async () => {
      const { VoiceConnection } = await import('../../lib/livekit');

      const mockConnection = vi.mocked(VoiceConnection).mock.results[0].value;

      render(<VoiceInterface {...defaultProps} showVolumeIndicator={true} />);

      // Simulate volume change
      mockConnection.volume = 0.5;
      if (mockConnection.onStateChanged) {
        mockConnection.onStateChanged({
          isConnected: true,
          isRecording: false,
          isSpeaking: false,
          volume: 0.5,
        });
      }

      await waitFor(() => {
        const volumeBar = screen.getByRole('progressbar', { name: /volume/i });
        expect(volumeBar).toHaveAttribute('aria-valuenow', '0.5');
      });
    });
  });

  describe('Speech Synthesis', () => {
    it('should speak text when speech synthesis is enabled', async () => {
      const user = userEvent.setup();

      render(<VoiceInterface {...defaultProps} enableSpeechSynthesis={true} />);

      const speakButton = screen.getByRole('button', { name: /speak/i });
      await user.click(speakButton);

      // Should show text input for speech synthesis
      expect(screen.getByPlaceholderText(/text to speak/i)).toBeInTheDocument();
    });

    it('should not show speech synthesis controls when disabled', () => {
      render(<VoiceInterface {...defaultProps} enableSpeechSynthesis={false} />);

      expect(screen.queryByRole('button', { name: /speak/i })).not.toBeInTheDocument();
    });

    it('should use selected language for speech synthesis', async () => {
      const user = userEvent.setup();

      render(<VoiceInterface {...defaultProps} enableSpeechSynthesis={true} language="es-ES" />);

      const speakButton = screen.getByRole('button', { name: /speak/i });
      await user.click(speakButton);

      const textInput = screen.getByPlaceholderText(/text to speak/i);
      await user.type(textInput, 'Hola mundo');

      const speakTextButton = screen.getByRole('button', { name: /speak text/i });
      await user.click(speakTextButton);

      await waitFor(() => {
        expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      });
    });
  });

  describe('Settings Panel', () => {
    it('should open settings when settings button is clicked', async () => {
      const user = userEvent.setup();

      render(<VoiceInterface {...defaultProps} showSettings={true} />);

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText(/voice settings/i)).toBeInTheDocument();
      });
    });

    it('should close settings when close button is clicked', async () => {
      const user = userEvent.setup();

      render(<VoiceInterface {...defaultProps} showSettings={true} />);

      // Open settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText(/voice settings/i)).toBeInTheDocument();
      });

      // Close settings
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/voice settings/i)).not.toBeInTheDocument();
      });
    });

    it('should allow changing language', async () => {
      const user = userEvent.setup();

      render(<VoiceInterface {...defaultProps} showSettings={true} />);

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
      });

      const languageSelect = screen.getByLabelText(/language/i);
      await user.selectOptions(languageSelect, 'es-ES');

      // Language change should be handled
      expect(languageSelect).toHaveValue('es-ES');
    });
  });

  describe('Microphone Permissions', () => {
    it('should request microphone permission when starting recording', async () => {
      const user = userEvent.setup();

      render(<VoiceInterface {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      const recordButton = screen.getByRole('button', { name: /microphone/i });
      await user.click(recordButton);

      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    it('should handle microphone permission denial gracefully', async () => {
      const user = userEvent.setup();

      // Mock permission denial
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

      render(<VoiceInterface {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      const recordButton = screen.getByRole('button', { name: /microphone/i });
      await user.click(recordButton);

      await waitFor(() => {
        expect(screen.getByText(/microphone permission denied/i)).toBeInTheDocument();
      });
    });

    it('should show microphone permission status', async () => {
      // Mock permission granted
      mockGetUserMedia.mockResolvedValue({
        getAudioTracks: () => [{ enabled: true, stop: vi.fn() }],
        getVideoTracks: () => [],
      });

      render(<VoiceInterface {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/microphone ready/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<VoiceInterface {...defaultProps} />);

      expect(screen.getByRole('button', { name: /microphone/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: /connect/i })).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      render(<VoiceInterface {...defaultProps} />);

      // Tab through controls
      await user.tab();
      expect(screen.getByRole('button', { name: /connect/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /microphone/i })).toHaveFocus();
    });

    it('should announce recording state to screen readers', async () => {
      const user = userEvent.setup();

      render(<VoiceInterface {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      const recordButton = screen.getByRole('button', { name: /microphone/i });
      await user.click(recordButton);

      await waitFor(() => {
        expect(screen.getByRole('status', { name: /recording status/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle recording errors gracefully', async () => {
      const user = userEvent.setup();
      const { VoiceConnection } = await import('../../lib/livekit');

      // Mock recording error
      vi.mocked(VoiceConnection).mockImplementation(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
        startRecording: vi.fn().mockRejectedValue(new Error('Recording failed')),
        stopRecording: vi.fn(),
        isConnected: false,
        isRecording: false,
        isSupported: true,
        isMicrophoneEnabled: true,
        volume: 0,
        onStateChanged: vi.fn(),
        onTranscriptReceived: vi.fn(),
        onError: vi.fn(),
      }));

      render(<VoiceInterface {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      const recordButton = screen.getByRole('button', { name: /microphone/i });
      await user.click(recordButton);

      await waitFor(() => {
        expect(screen.getByText(/recording failed/i)).toBeInTheDocument();
      });
    });

    it('should handle speech synthesis errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock speech synthesis error
      mockSpeechSynthesis.speak.mockImplementation(() => {
        throw new Error('Speech synthesis failed');
      });

      render(<VoiceInterface {...defaultProps} enableSpeechSynthesis={true} />);

      const speakButton = screen.getByRole('button', { name: /speak/i });
      await user.click(speakButton);

      const textInput = screen.getByPlaceholderText(/text to speak/i);
      await user.type(textInput, 'Test text');

      const speakTextButton = screen.getByRole('button', { name: /speak text/i });
      await user.click(speakTextButton);

      await waitFor(() => {
        expect(screen.getByText(/speech synthesis failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Browser Compatibility', () => {
    it('should handle unsupported browsers gracefully', async () => {
      const { VoiceConnection } = await import('../../lib/livekit');

      // Mock unsupported browser
      vi.mocked(VoiceConnection).mockImplementation(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        isConnected: false,
        isRecording: false,
        isSupported: false,
        isMicrophoneEnabled: false,
        volume: 0,
        onStateChanged: vi.fn(),
        onTranscriptReceived: vi.fn(),
        onError: vi.fn(),
      }));

      render(<VoiceInterface {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/voice features not supported/i)).toBeInTheDocument();
      });
    });

    it('should handle missing MediaRecorder API', async () => {
      // Remove MediaRecorder from global
      const originalMediaRecorder = global.MediaRecorder;
      delete (global as any).MediaRecorder;

      render(<VoiceInterface {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/voice recording not supported/i)).toBeInTheDocument();
      });

      // Restore MediaRecorder
      global.MediaRecorder = originalMediaRecorder;
    });

    it('should handle missing Speech Synthesis API', async () => {
      // Remove speechSynthesis from global
      const originalSpeechSynthesis = global.speechSynthesis;
      delete (global as any).speechSynthesis;

      render(<VoiceInterface {...defaultProps} enableSpeechSynthesis={true} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /speak/i })).not.toBeInTheDocument();
      });

      // Restore speechSynthesis
      global.speechSynthesis = originalSpeechSynthesis;
    });
  });
});