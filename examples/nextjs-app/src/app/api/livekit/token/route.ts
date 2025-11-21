import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      roomName,
      participantName,
      participantIdentity,
      canPublish = true,
      canSubscribe = true,
      ttl = 3600 // 1 hour default
    } = body;

    // Validate required fields
    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'Room name and participant name are required' },
        { status: 400 }
      );
    }

    // Get LiveKit credentials from environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('LiveKit credentials not configured');
      return NextResponse.json(
        { error: 'LiveKit server not configured' },
        { status: 500 }
      );
    }

    console.log('LiveKit credentials loaded:', {
      apiKey: apiKey.substring(0, 8) + '...',
      apiSecret: apiSecret.substring(0, 8) + '...'
    });

    // Generate unique participant identity if not provided
    const identity = participantIdentity || `user-${crypto.randomUUID()}`;

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: participantName,
    });

    // Add video grant for room access
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish,
      canSubscribe,
    });

    // Set token expiration
    token.ttl = ttl;

    // Generate JWT
    const jwt: string = await token.toJwt();

    console.log('JWT token generated successfully:', {
      jwtType: typeof jwt,
      jwtValue: jwt,
      jwtLength: typeof jwt === 'string' ? jwt.length : 'not a string',
      jwtPreview: typeof jwt === 'string' ? jwt.substring(0, 50) + '...' : 'not a string'
    });

    // Log token generation for security monitoring
    const clientIP = request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    console.log(`LiveKit token generated: room=${roomName}, identity=${identity}, ip=${clientIP}`);

    return NextResponse.json({
      token: jwt,
      identity,
      roomName,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString()
    });

  } catch (error) {
    console.error('Token generation error:', error);

    // Don't expose detailed error messages to client
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Token generation details:', errorMessage);

    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
