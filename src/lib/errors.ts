import { JodexError as JodexErrorType } from '../types';

export class JodexError extends Error {
  code: string;
  type: 'api' | 'voice' | 'network' | 'validation' | 'unknown';
  details?: any;

  constructor(message: string, type: JodexErrorType['type'] = 'unknown', code?: string) {
    super(message);
    this.name = 'JodexError';
    this.type = type;
    this.code = code || 'UNKNOWN_ERROR';
  }
}