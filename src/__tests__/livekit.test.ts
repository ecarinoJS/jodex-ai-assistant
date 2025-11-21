import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { VoiceConnection } from '../lib/livekit';
import { JodexError } from '../lib/errors';

// Mock dependencies
vi.mock('livekit-client', () => ({
  Room: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    localParticipant: {
      publishTrack: vi.fn(),
      unpublishTrack: vi.fn(),
    },
  })),
  AudioTrack: vi.fn(),
  LocalAudioTrack: vi.fn(),
  RemoteParticipant: vi.fn(),
}));

// Mock fetch for server-side token generation
global.fetch = vi.fn();

describe('VoiceConnection', () => {
  let voiceConnection: VoiceConnection;
  let mockFetch: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = global.fetch as Mock;
  });

  afterEach(() => {
    if (voiceConnection) {
      voiceConnection.disconnect();
    }
  });

  describe('Constructor', () => {
    it('should initialize with provided token', () => {
      voiceConnection = new VoiceConnection({
        url: 'wss://test.livekit.cloud',
        token: 'test-token',
        useServerToken: false,
      });

      expect(voiceConnection).toBeInstanceOf(VoiceConnection);
    });

    it('should throw error when token is missing and not using server-side generation', () => {
      expect(() => {
        new VoiceConnection({
          url: 'wss://test.livekit.cloud',
          useServerToken: false,
        });
      }).toThrow(JodexError);
    });

    it('should initialize for server-side token generation', () => {
      voiceConnection = new VoiceConnection({
        url: 'wss://test.livekit.cloud',
        roomName: 'test-room',
        participantName: 'Test User',
        useServerToken: true,
      });

      expect(voiceConnection).toBeInstanceOf(VoiceConnection);
    });
  });

  describe('Server-side Token Generation', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          token: 'generated-jwt-token',
        }),
      });
    });

    it('should generate token from server', async () => {
      voiceConnection = new VoiceConnection({
        url: 'wss://test.livekit.cloud',
        roomName: 'test-room',
        participantName: 'Test User',
        useServerToken: true,
      });

      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async initialization

      expect(mockFetch).toHaveBeenCalledWith('/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: 'test-room',
          participantName: 'Test User',
          participantIdentity: undefined,
        }),
      });
    });

    it('should handle token generation failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: 'Token generation failed',
        }),
      });

      const onError = vi.fn();
      voiceConnection = new VoiceConnection({
        url: 'wss://test.livekit.cloud',
        roomName: 'test-room',
        participantName: 'Test User',
        useServerToken: true,
      });

      voiceConnection.onError(onError);

      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async initialization

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token generation failed',
          type: 'voice',
        })
      );
    });
  });

  describe('Security Features', () => {
    it('should validate room name parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          token: 'test-token',
        }),
      });

      voiceConnection = new VoiceConnection({
        url: 'wss://test.livekit.cloud',
        roomName: 'test-room-with-special-chars',
        participantName: 'Test User',
        useServerToken: true,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/livekit/token',
        expect.objectContaining({
          body: expect.stringContaining('test-room-with-special-chars'),
        })
      );
    });

    it('should include participant identity in token request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          token: 'test-token',
        }),
      });

      voiceConnection = new VoiceConnection({
        url: 'wss://test.livekit.cloud',
        roomName: 'test-room',
        participantName: 'Test User',
        participantIdentity: 'user-123',
        useServerToken: true,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/livekit/token',
        expect.objectContaining({
          body: expect.stringContaining('user-123'),
        })
      );
    });
  });
});