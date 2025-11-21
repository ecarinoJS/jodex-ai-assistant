import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { OpenAIClient } from '../lib/openai';
import { JodexError } from '../lib/errors';
import { Message } from '../types';

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

import OpenAI from 'openai';

describe('OpenAIClient', () => {
  let openaiClient: OpenAIClient;
  let mockOpenAI: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenAI = new OpenAI() as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with valid API key', () => {
      openaiClient = new OpenAIClient({
        apiKey: 'test-api-key',
      });

      expect(openaiClient).toBeInstanceOf(OpenAIClient);
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        dangerouslyAllowBrowser: true,
      });
    });

    it('should throw error without API key', () => {
      expect(() => {
        new OpenAIClient({
          apiKey: '',
        });
      }).toThrow(JodexError);
    });

    it('should set default options', () => {
      openaiClient = new OpenAIClient({
        apiKey: 'test-api-key',
      });

      const options = openaiClient.getOptions();
      expect(options.model).toBe('gpt-4-turbo-preview');
      expect(options.temperature).toBe(0.7);
      expect(options.streaming).toBe(true);
    });
  });

  describe('Chat Completion', () => {
    beforeEach(() => {
      openaiClient = new OpenAIClient({
        apiKey: 'test-api-key',
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        maxTokens: 500,
      });
    });

    it('should handle streaming chat completion', async () => {
      const mockStreamChunks = [
        { choices: [{ delta: { content: 'Hello' } }] },
        { choices: [{ delta: { content: ' world' } }] },
        { choices: [{ delta: { content: '!' }, finish_reason: 'stop' }] },
      ];

      // Create a proper async iterator mock
      const mockAsyncIterator = {
        [Symbol.asyncIterator]: () => ({
          next: async () => {
            const chunk = mockStreamChunks.shift();
            if (chunk) {
              return { value: chunk, done: false };
            }
            return { value: undefined, done: true };
          }
        })
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAsyncIterator);

      const messages: Message[] = [
        { id: '1', content: 'Hello', role: 'user', timestamp: new Date() },
      ];

      const results = [];
      for await (const result of openaiClient.streamChatCompletion(messages)) {
        results.push(result);
      }

      expect(results).toHaveLength(3);
      expect(results[0].content).toBe('Hello');
      expect(results[1].content).toBe(' world');
      expect(results[2].content).toBe('!');
    });

    it('should handle non-streaming chat completion', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Hello world!',
          },
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const messages: Message[] = [
        { id: '1', content: 'Hello', role: 'user', timestamp: new Date() },
      ];

      const result = await openaiClient.chatCompletion(messages);

      expect(result.content).toBe('Hello world!');
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });
    });

    it('should extract actions from AI response', async () => {
      const responseWithActions = {
        choices: [{
          message: {
            content: 'Here is the response\n```action\n{"type": "show_weather_alerts", "data": {"severity": "high"}}\n```',
          },
        }],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(responseWithActions);

      const messages: Message[] = [
        { id: '1', content: 'Check weather', role: 'user', timestamp: new Date() },
      ];

      const result = await openaiClient.chatCompletion(messages);

      expect(result.actions).toHaveLength(1);
      expect(result.actions![0]).toEqual({
        type: 'show_weather_alerts',
        data: { severity: 'high' },
        priority: 'medium',
        timestamp: expect.any(String),
      });
    });

    it('should handle API errors', async () => {
      const apiError = {
        status: 401,
        message: 'Invalid API key',
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      const messages: Message[] = [
        { id: '1', content: 'Hello', role: 'user', timestamp: new Date() },
      ];

      await expect(openaiClient.chatCompletion(messages)).rejects.toThrow(JodexError);
    });

    it('should format messages correctly', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const messages: Message[] = [
        { id: '1', content: 'User message 1', role: 'user', timestamp: new Date() },
        { id: '2', content: 'Assistant response', role: 'assistant', timestamp: new Date() },
        { id: '3', content: 'User message 2', role: 'user', timestamp: new Date() },
      ];

      await openaiClient.chatCompletion(messages);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: 'User message 1' }),
            expect.objectContaining({ role: 'user', content: 'User message 2' }),
          ]),
        })
      );
    });
  });

  describe('System Prompt Building', () => {
    it('should use custom system prompt', () => {
      openaiClient = new OpenAIClient({
        apiKey: 'test-api-key',
        systemPrompt: 'Custom system prompt',
      });

      const options = openaiClient.getOptions();
      expect(options.systemPrompt).toBe('Custom system prompt');
    });

    it('should use default system prompt when none provided', () => {
      openaiClient = new OpenAIClient({
        apiKey: 'test-api-key',
      });

      const options = openaiClient.getOptions();
      expect(options.systemPrompt).toBeUndefined(); // Should use internal default
    });

    it('should include datasets in system prompt', () => {
      const datasets = {
        farmers: [{ id: 1, name: 'John Doe' }],
        weather: [{ date: '2024-01-01', temperature: 25 }],
      };

      openaiClient = new OpenAIClient({
        apiKey: 'test-api-key',
        datasets,
      });

      const options = openaiClient.getOptions();
      expect(options.datasets).toEqual(datasets);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      openaiClient = new OpenAIClient({
        apiKey: 'test-api-key',
      });
    });

    it('should handle 401 unauthorized error', async () => {
      const unauthorizedError = {
        status: 401,
        message: 'Invalid API key',
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(unauthorizedError);

      const messages: Message[] = [
        { id: '1', content: 'Hello', role: 'user', timestamp: new Date() },
      ];

      try {
        await openaiClient.chatCompletion(messages);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(JodexError);
        expect((error as JodexError).message).toBe('Invalid OpenAI API key');
        expect((error as JodexError).type).toBe('api');
      }
    });

    it('should handle rate limit error', async () => {
      const rateLimitError = {
        status: 429,
        message: 'Rate limit exceeded',
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(rateLimitError);

      const messages: Message[] = [
        { id: '1', content: 'Hello', role: 'user', timestamp: new Date() },
      ];

      try {
        await openaiClient.chatCompletion(messages);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(JodexError);
        expect((error as JodexError).message).toBe('Rate limit exceeded. Please try again later.');
        expect((error as JodexError).type).toBe('api');
      }
    });

    it('should handle server error', async () => {
      const serverError = {
        status: 500,
        message: 'Internal server error',
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(serverError);

      const messages: Message[] = [
        { id: '1', content: 'Hello', role: 'user', timestamp: new Date() },
      ];

      try {
        await openaiClient.chatCompletion(messages);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(JodexError);
        expect((error as JodexError).message).toBe('OpenAI service temporarily unavailable');
        expect((error as JodexError).type).toBe('api');
      }
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      openaiClient = new OpenAIClient({
        apiKey: 'test-api-key',
        model: 'gpt-3.5-turbo',
      });
    });

    it('should update configuration', () => {
      openaiClient.updateOptions({
        model: 'gpt-4',
        temperature: 0.8,
      });

      const options = openaiClient.getOptions();
      expect(options.model).toBe('gpt-4');
      expect(options.temperature).toBe(0.8);
    });

    it('should update API key and recreate client', () => {
      openaiClient.updateOptions({
        apiKey: 'new-api-key',
      });

      expect(OpenAI).toHaveBeenCalledTimes(2); // Initial + update
      expect(OpenAI).toHaveBeenLastCalledWith({
        apiKey: 'new-api-key',
        dangerouslyAllowBrowser: true,
      });
    });
  });
});