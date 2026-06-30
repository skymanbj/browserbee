import { jest } from '@jest/globals';

export default class OpenAI {
  chat = {
    completions: {
      create: jest.fn(),
    },
  };
}
