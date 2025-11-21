import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 requests per minute per IP

export function middleware(request: NextRequest) {
  // Only apply to POST requests
  if (request.method !== 'POST') {
    return NextResponse.next();
  }

  const clientIP = getClientIP(request);
  const now = Date.now();

  // Get current rate limit data for this IP
  const rateLimitData = rateLimitMap.get(clientIP) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };

  // Reset window if expired
  if (now > rateLimitData.resetTime) {
    rateLimitData.count = 0;
    rateLimitData.resetTime = now + RATE_LIMIT_WINDOW;
  }

  // Increment request count
  rateLimitData.count++;
  rateLimitMap.set(clientIP, rateLimitData);

  // Check rate limit
  if (rateLimitData.count > RATE_LIMIT_MAX_REQUESTS) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(rateLimitData.resetTime / 1000).toString(),
        }
      }
    );
  }

  // Validate request size
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024) {
    console.warn(`Request too large from IP: ${clientIP}, size: ${contentLength}`);
    return NextResponse.json(
      { error: 'Request payload too large' },
      { status: 413 }
    );
  }

  // Add security headers
  const response = NextResponse.next();

  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
  response.headers.set('X-RateLimit-Remaining', (RATE_LIMIT_MAX_REQUESTS - rateLimitData.count).toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitData.resetTime / 1000).toString());

  // Log request for security monitoring
  const userAgent = request.headers.get('user-agent') || 'unknown';
  console.log(`LiveKit token request: ip=${clientIP}, agent=${userAgent}, count=${rateLimitData.count}`);

  return response;
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (clientIP) {
    return clientIP;
  }

  // Fallback to request IP
  return request.ip || 'unknown';
}

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of Array.from(rateLimitMap.entries())) {
    if (now > data.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

export const config = {
  matcher: '/api/livekit/token',
};