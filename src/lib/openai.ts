import { Message, Action, Datasets } from '../types';
import { JodexError } from './errors';

export interface ChatCompletionOptions {
  apiUrl?: string; // API proxy URL for secure calls
  apiKey?: string; // Only needed for direct API calls (not recommended)
  systemPrompt?: string;
  instructions?: string;
  datasets?: Datasets;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

export interface ChatCompletionResult {
  content: string;
  actions?: Action[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class OpenAIClient {
  private options: ChatCompletionOptions;

  constructor(options: ChatCompletionOptions) {
    if (!options.apiUrl && !options.apiKey) {
      throw new JodexError(
        'Either apiUrl (recommended for security) or apiKey is required',
        'validation',
        'MISSING_API_CONFIG'
      );
    }

    if (options.apiKey) {
      console.warn(
        'Using API key directly is not recommended. Consider using an API proxy route for better security.'
      );
    }

    this.options = {
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 2000,
      streaming: true,
      ...options,
    };
  }

  /**
   * Generate a chat completion with streaming support
   */
  async *streamChatCompletion(messages: Message[]): AsyncGenerator<ChatCompletionResult, void, unknown> {
    try {
      const systemContent = this.buildSystemPrompt();
      const openaiMessages = this.formatMessages(messages, systemContent);

      if (this.options.apiUrl) {
        // Use API proxy for secure calls
        yield* this.streamViaProxy(openaiMessages);
      } else {
        // Fallback to direct OpenAI client (not recommended)
        yield* this.streamViaDirectAPI(openaiMessages);
      }
    } catch (error) {
      const jodexError = this.handleError(error);
      throw jodexError;
    }
  }

  /**
   * Stream via API proxy (secure method)
   */
  private async *streamViaProxy(
    openaiMessages: any[]
  ): AsyncGenerator<ChatCompletionResult, void, unknown> {
    const response = await fetch(`${this.options.apiUrl}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: openaiMessages,
        model: this.options.model,
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new JodexError(
        errorData.error || 'API request failed',
        'api',
        'PROXY_ERROR'
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new JodexError('No response body', 'api', 'NO_RESPONSE_BODY');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new JodexError(parsed.error, 'api', 'PROXY_ERROR');
              }

              if (parsed.done) {
                const actions = this.extractActions(parsed.content || '');
                yield {
                  content: parsed.content || '',
                  actions,
                };
                return;
              }

              if (parsed.content) {
                yield { content: parsed.content };
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Stream via direct OpenAI API (fallback method - not secure)
   */
  private async *streamViaDirectAPI(
    openaiMessages: any[]
  ): AsyncGenerator<ChatCompletionResult, void, unknown> {
    // Dynamic import to avoid bundling issues
    const { default: OpenAI } = await import('openai');

    const client = new OpenAI({
      apiKey: this.options.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const stream = await client.chat.completions.create({
      model: this.options.model!,
      messages: openaiMessages,
      temperature: this.options.temperature,
      max_tokens: this.options.maxTokens,
      stream: true,
    });

    let content = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta.content) {
        content += delta.content;
        yield { content };
      }

      // Check for complete message
      if (chunk.choices[0]?.finish_reason === 'stop') {
        const actions = this.extractActions(content);
        yield {
          content,
          actions,
          usage: chunk.usage ? {
            promptTokens: chunk.usage.prompt_tokens || 0,
            completionTokens: chunk.usage.completion_tokens || 0,
            totalTokens: chunk.usage.total_tokens || 0,
          } : undefined,
        };
      }
    }
  }

  /**
   * Generate a single chat completion (non-streaming)
   */
  async chatCompletion(messages: Message[]): Promise<ChatCompletionResult> {
    try {
      const systemContent = this.buildSystemPrompt();
      const openaiMessages = this.formatMessages(messages, systemContent);

      if (this.options.apiUrl) {
        // Use API proxy for secure calls
        return await this.completionViaProxy(openaiMessages);
      } else {
        // Fallback to direct OpenAI client (not recommended)
        return await this.completionViaDirectAPI(openaiMessages);
      }
    } catch (error) {
      const jodexError = this.handleError(error);
      throw jodexError;
    }
  }

  /**
   * Get completion via API proxy (secure method)
   */
  private async completionViaProxy(
    openaiMessages: any[]
  ): Promise<ChatCompletionResult> {
    const response = await fetch(this.options.apiUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: openaiMessages,
        model: this.options.model,
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new JodexError(
        errorData.error || 'API request failed',
        'api',
        'PROXY_ERROR'
      );
    }

    const data = await response.json();
    const content = data.content || '';
    const actions = this.extractActions(content);

    return {
      content,
      actions,
    };
  }

  /**
   * Get completion via direct OpenAI API (fallback method - not secure)
   */
  private async completionViaDirectAPI(
    openaiMessages: any[]
  ): Promise<ChatCompletionResult> {
    // Dynamic import to avoid bundling issues
    const { default: OpenAI } = await import('openai');

    const client = new OpenAI({
      apiKey: this.options.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const response = await client.chat.completions.create({
      model: this.options.model!,
      messages: openaiMessages,
      temperature: this.options.temperature,
      max_tokens: this.options.maxTokens,
      stream: false,
    });

    const content = response.choices[0]?.message?.content || '';
    const actions = this.extractActions(content);

    return {
      content,
      actions,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens || 0,
        completionTokens: response.usage.completion_tokens || 0,
        totalTokens: response.usage.total_tokens || 0,
      } : undefined,
    };
  }

  /**
   * Build the system prompt with context and datasets
   */
  private buildSystemPrompt(): string {
    const parts: string[] = [];

    // Add base system prompt
    if (this.options.systemPrompt) {
      parts.push(this.options.systemPrompt);
    } else {
      parts.push(this.getDefaultSystemPrompt());
    }

    // Add additional instructions
    if (this.options.instructions) {
      parts.push(`\nAdditional Instructions:\n${this.options.instructions}`);
    }

    // Add datasets context
    if (this.options.datasets) {
      parts.push(this.buildDatasetContext(this.options.datasets));
    }

    return parts.join('\n\n');
  }

  /**
   * Get the default system prompt for Jodex AI Assistant
   */
  private getDefaultSystemPrompt(): string {
    return `You are Jodex, an AI assistant specializing in agricultural supply chain management for cacao farming operations.

Your role is to help farmers, processors, and agricultural cooperatives make informed decisions by analyzing data about farmers, weather conditions, harvest records, disease patterns, and inventory levels.

Key capabilities:
- Analyze farmer data and production trends
- Provide weather-based insights and alerts
- Identify disease risk factors based on weather patterns
- Help with inventory management and supply forecasting
- Suggest optimal actions based on data analysis

When responding:
1. Be helpful, proactive, and practical
2. Base your recommendations on the provided data
3. Suggest specific, actionable steps
4. Alert users to potential problems or opportunities
5. Keep responses concise but comprehensive

You can trigger UI actions using this format:
\`\`\`action
{
  "type": "action_type",
  "data": { ... },
  "priority": "high|medium|low"
}
\`\`\`

Available action types:
- show_supply_forecast: Show supply predictions
- show_farmer_list: Display farmer information
- show_weather_alerts: Show weather-based alerts
- show_disease_map: Display disease risk information
- show_inventory: Show current inventory levels
- open_farmer_profile: Show specific farmer details
- send_notification: Send a notification message`;
  }

  /**
   * Build dataset context for the AI
   */
  private buildDatasetContext(datasets: Datasets): string {
    const contextParts: string[] = [];
    contextParts.push('Available Data:');

    if (datasets.farmers && datasets.farmers.length > 0) {
      contextParts.push(`- Farmers: ${datasets.farmers.length} profiles with production data`);
    }

    if (datasets.harvests && datasets.harvests.length > 0) {
      contextParts.push(`- Harvest Records: ${datasets.harvests.length} historical records`);
    }

    if (datasets.weather && datasets.weather.length > 0) {
      contextParts.push(`- Weather Data: ${datasets.weather.length} days of data`);
    }

    if (datasets.diseases && datasets.diseases.length > 0) {
      contextParts.push(`- Disease Database: ${datasets.diseases.length} disease/pest entries`);
    }

    if (datasets.inventory) {
      contextParts.push(`- Inventory: Current stock levels and usage rates`);
    }

    // Add custom datasets
    Object.keys(datasets).forEach(key => {
      if (!['farmers', 'harvests', 'weather', 'diseases', 'inventory'].includes(key)) {
        const data = datasets[key];
        if (Array.isArray(data)) {
          contextParts.push(`- ${key}: ${data.length} entries`);
        } else {
          contextParts.push(`- ${key}: Available data`);
        }
      }
    });

    return contextParts.join('\n');
  }

  /**
   * Format messages for OpenAI API
   */
  private formatMessages(messages: Message[], systemContent: string): OpenAI.Chat.ChatCompletionMessageParam[] {
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemContent,
      },
    ];

    // Add user messages only (skip assistant messages to avoid confusion)
    messages
      .filter(msg => msg.role === 'user')
      .forEach(msg => {
        openaiMessages.push({
          role: 'user',
          content: msg.content,
        });
      });

    return openaiMessages;
  }

  /**
   * Extract actions from AI response
   */
  private extractActions(content: string): Action[] {
    const actions: Action[] = [];
    const actionRegex = /```action\s*([\s\S]*?)```/g;

    let match;
    while ((match = actionRegex.exec(content)) !== null) {
      try {
        const actionData = JSON.parse(match[1].trim());
        actions.push({
          type: actionData.type || 'custom',
          data: actionData.data || {},
          priority: actionData.priority || 'medium',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.warn('Failed to parse action:', match[1]);
      }
    }

    return actions;
  }

  /**
   * Handle API errors and convert to JodexError
   */
  private handleError(error: any): JodexError {
    if (error instanceof JodexError) {
      return error;
    }

    if (error.status === 401) {
      return new JodexError('Invalid OpenAI API key', 'api', 'INVALID_API_KEY');
    }

    if (error.status === 429) {
      return new JodexError('Rate limit exceeded. Please try again later.', 'api', 'RATE_LIMIT');
    }

    if (error.status >= 500) {
      return new JodexError('OpenAI service temporarily unavailable', 'api', 'SERVICE_UNAVAILABLE');
    }

    const jodexError = new JodexError(error.message || 'Unknown error occurred', 'api', 'UNKNOWN_ERROR');
    jodexError.details = error;
    return jodexError;
  }

  /**
   * Update configuration
   */
  updateOptions(options: Partial<ChatCompletionOptions>): void {
    this.options = { ...this.options, ...options };

    if (options.apiKey) {
      console.warn(
        'Using API key directly is not recommended. Consider using an API proxy route for better security.'
      );
    }
  }

  /**
   * Get current configuration
   */
  getOptions(): ChatCompletionOptions {
    return { ...this.options };
  }
}