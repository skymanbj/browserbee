import { jest } from '@jest/globals';

export class GoogleGenAI {
  models = {
    generateContentStream: jest.fn(),
  };
}

export type Content = any;
