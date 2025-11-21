import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// Configuration for OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting store
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

export const config = {
  api: {
    responseLimit: false, // Disable response size limit for streaming
  },
};

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

    const {
      messages,
      model = 'gpt-4-turbo-preview',
      temperature = 0.7,
      maxTokens = 2000
    } = req.body;

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

    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Create the streaming chat completion
    const stream = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    let accumulatedContent = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';

      if (content) {
        accumulatedContent += content;

        // Send the chunk to the client
        res.write(`data: ${JSON.stringify({
          content,
          accumulatedContent,
        })}\n\n`);
      }
    }

    // Send a final message indicating completion
    res.write(`data: ${JSON.stringify({
      done: true,
      content: accumulatedContent,
    })}\n\n`);

    res.end();

  } catch (error: any) {
    console.error('OpenAI Streaming API Error:', error);

    // Send error as SSE
    const errorData = {
      error: error.message || 'An unexpected error occurred',
    };

    res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    res.end();

    // Don't send a status code here as headers are already written for SSE
  }
}