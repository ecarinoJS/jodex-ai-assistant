const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const http = require('http');

// Configuration
const PORT = process.env.PORT || 7880;
const JWT_SECRET = process.env.JWT_SECRET || 'jodex-test-secret-key-change-in-production';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'test-api-key';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'test-api-secret';

// Rate limiting configuration
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Create Express app
const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '1kb' })); // Limit request body size

// Rate limiting for token generation
app.use('/api/livekit/token', rateLimiter);

// In-memory storage for rooms and participants
const rooms = new Map();
const participants = new Map();

// Mock LiveKit JWT token generation
function generateLiveKitToken(payload) {
  // Create a mock JWT token that resembles LiveKit's format
  const tokenPayload = {
    sub: payload.participantIdentity || `user_${uuidv4()}`,
    iss: LIVEKIT_API_KEY,
    name: payload.participantName || 'Test User',
    video: { roomJoin: true, roomAdmin: false },
    room: payload.roomName || 'test-room',
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiration
    iat: Math.floor(Date.now() / 1000),
    jti: uuidv4(),
  };

  return jwt.sign(tokenPayload, LIVEKIT_API_SECRET, { algorithm: 'HS256' });
}

// Token generation endpoint (mock LiveKit server)
app.post('/api/livekit/token', async (req, res) => {
  try {
    const { roomName, participantName, participantIdentity } = req.body;

    // Validate input
    if (!roomName || !participantName) {
      return res.status(400).json({
        error: 'Room name and participant name are required'
      });
    }

    // Generate mock JWT token
    const token = generateLiveKitToken({
      roomName,
      participantName,
      participantIdentity: participantIdentity || `user_${uuidv4()}`,
    });

    // Log token generation for security monitoring
    console.log(`Token generated for ${participantName} in room ${roomName}`);

    res.json({
      token,
      serverUrl: `ws://localhost:${PORT}`,
      expiresIn: 3600, // 1 hour
    });

  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({
      error: 'Failed to generate token'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    rooms: rooms.size,
    participants: participants.size,
  });
});

// Room info endpoint
app.get('/api/rooms/:roomName', (req, res) => {
  const { roomName } = req.params;
  const room = rooms.get(roomName);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json({
    name: roomName,
    participants: Array.from(room.participants || []),
    createdAt: room.createdAt,
  });
});

// WebSocket server for LiveKit mock
const wss = new WebSocket.Server({
  server,
  path: '/rtc',
  verifyClient: (info) => {
    // Basic validation - in production, verify JWT token
    return true; // Allow all connections for testing
  }
});

// Mock LiveKit WebSocket protocol
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');

  const clientId = uuidv4();
  const clientInfo = {
    id: clientId,
    connectedAt: new Date(),
    room: null,
    participant: null,
  };

  participants.set(clientId, clientInfo);

  // Send welcome message (mock LiveKit protocol)
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId: clientId,
    serverInfo: {
      version: '2.14.1',
      node: 'mock-server',
      region: 'local',
    },
  }));

  // Handle messages from client
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'join_room':
          handleJoinRoom(ws, message, clientInfo);
          break;

        case 'leave_room':
          handleLeaveRoom(ws, message, clientInfo);
          break;

        case 'publish_track':
          handlePublishTrack(ws, message, clientInfo);
          break;

        case 'unsubscribe_track':
          handleUnsubscribeTrack(ws, message, clientInfo);
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Invalid message format',
      }));
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`WebSocket connection closed: ${clientId}`);

    // Clean up participant from room
    if (clientInfo.room && clientInfo.participant) {
      const room = rooms.get(clientInfo.room);
      if (room) {
        room.participants.delete(clientInfo.participant);
        broadcastToRoom(clientInfo.room, {
          type: 'participant_disconnected',
          participant: clientInfo.participant,
        });
      }
    }

    participants.delete(clientId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function handleJoinRoom(ws, message, clientInfo) {
  const { roomName, participant } = message;

  // Create room if it doesn't exist
  if (!rooms.has(roomName)) {
    rooms.set(roomName, {
      name: roomName,
      createdAt: new Date(),
      participants: new Set(),
    });
  }

  const room = rooms.get(roomName);
  room.participants.add(participant.identity);

  clientInfo.room = roomName;
  clientInfo.participant = participant;

  // Send join response
  ws.send(JSON.stringify({
    type: 'room_joined',
    room: {
      name: roomName,
      participants: Array.from(room.participants),
    },
  }));

  // Notify other participants
  broadcastToRoom(roomName, {
    type: 'participant_connected',
    participant: participant,
  }, ws);

  console.log(`Participant ${participant.name} joined room ${roomName}`);
}

function handleLeaveRoom(ws, message, clientInfo) {
  if (!clientInfo.room || !clientInfo.participant) return;

  const room = rooms.get(clientInfo.room);
  if (room) {
    room.participants.delete(clientInfo.participant.identity);

    // Notify other participants
    broadcastToRoom(clientInfo.room, {
      type: 'participant_disconnected',
      participant: clientInfo.participant,
    });
  }

  clientInfo.room = null;
  clientInfo.participant = null;

  ws.send(JSON.stringify({
    type: 'room_left',
  }));
}

function handlePublishTrack(ws, message, clientInfo) {
  // Mock track publishing
  ws.send(JSON.stringify({
    type: 'track_published',
    track: {
      id: uuidv4(),
      kind: message.trackKind || 'audio',
      name: message.trackName || 'microphone',
      participant: clientInfo.participant,
    },
  }));

  // Notify other participants
  if (clientInfo.room) {
    broadcastToRoom(clientInfo.room, {
      type: 'track_subscribed',
      track: {
        id: uuidv4(),
        kind: message.trackKind || 'audio',
        name: message.trackName || 'microphone',
        participant: clientInfo.participant,
      },
    }, ws);
  }
}

function handleUnsubscribeTrack(ws, message, clientInfo) {
  ws.send(JSON.stringify({
    type: 'track_unsubscribed',
    trackId: message.trackId,
  }));
}

function broadcastToRoom(roomName, message, excludeWs = null) {
  const room = rooms.get(roomName);
  if (!room) return;

  participants.forEach((participant, clientId) => {
    if (participant.room === roomName && participant.ws !== excludeWs) {
      if (participant.ws && participant.ws.readyState === WebSocket.OPEN) {
        participant.ws.send(JSON.stringify(message));
      }
    }
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Mock LiveKit Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/rtc`);
  console.log(`🔑 Token endpoint: http://localhost:${PORT}/api/livekit/token`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`\n📝 Test URLs:`);
  console.log(`   Test Page: http://localhost:3000/test`);
  console.log(`   LiveKit URL for Jodex: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});