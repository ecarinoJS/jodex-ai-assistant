import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// Configuration for OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting store (simple in-memory implementation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

function checkRateLimit(req: NextApiRequest): boolean {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const key = Array.isArray(ip) ? ip[0] : ip || 'unknown';
  const now = Date.now();

  const userLimit = rateLimitStore.get(key);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check rate limiting
    if (!checkRateLimit(req)) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.'
      });
    }

    const { messages, model = 'gpt-4-turbo-preview', temperature = 0.7, maxTokens = 2000 } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Validate message format
    const isValidMessage = (msg: any) =>
      msg && typeof msg === 'object' &&
      typeof msg.content === 'string' &&
      ['user', 'assistant', 'system'].includes(msg.role);

    if (!messages.every(isValidMessage)) {
      return res.status(400).json({
        error: 'Invalid message format. Each message must have content and role fields.'
      });
    }

    // Create the chat completion
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false, // Start with non-streaming, can be enhanced later
    });

    const response = completion.choices[0]?.message;

    if (!response) {
      return res.status(500).json({ error: 'No response from OpenAI' });
    }

    // Return the response
    res.status(200).json({
      content: response.content,
      role: response.role,
    });

  } catch (error: any) {
    console.error('OpenAI API Error:', error);

    // Handle specific OpenAI errors
    if (error.status === 401) {
      return res.status(500).json({
        error: 'Authentication failed. Please check API configuration.'
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please try again later.'
      });
    }

    if (error.status === 400) {
      return res.status(400).json({
        error: 'Invalid request. Please check your input.'
      });
    }

    // Generic error
    res.status(500).json({
      error: 'An unexpected error occurred. Please try again.'
    });
  }
}