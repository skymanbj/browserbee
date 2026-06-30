import { jest } from '@jest/globals';
import { runPuppeteerPrototype } from '../../src/background/puppeteerPrototype';

// Mock the puppeteer-core package browser entry point
jest.mock('puppeteer-core/lib/puppeteer/puppeteer-core-browser.js', () => {
  const mockPage = {
    title: jest.fn().mockResolvedValue('Mock Tab Title'),
    url: jest.fn().mockReturnValue('https://mock.com'),
    evaluate: jest.fn().mockResolvedValue({
      userAgent: 'MockAgent',
      viewportWidth: 1024,
      viewportHeight: 768,
      documentTitle: 'Mock Tab Title',
    }),
    screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-bytes')),
  };

  const mockBrowser = {
    pages: jest.fn().mockResolvedValue([mockPage]),
    close: jest.fn().mockResolvedValue(undefined),
  };

  return {
    connect: jest.fn().mockResolvedValue(mockBrowser),
    ExtensionTransport: {
      connectTab: jest.fn().mockResolvedValue({}),
    },
  };
});

describe('Puppeteer Prototype', () => {
  it('should successfully connect, execute operations, and disconnect', async () => {
    const result = await runPuppeteerPrototype(123);
    
    expect(result.success).toBe(true);
    expect(result.title).toBe('Mock Tab Title');
    expect(result.url).toBe('https://mock.com');
    expect(result.screenshotLength).toBe(10); // length of 'mock-bytes'
    expect(result.evaluatedResult).toEqual({
      userAgent: 'MockAgent',
      viewportWidth: 1024,
      viewportHeight: 768,
      documentTitle: 'Mock Tab Title',
    });
  });

  it('should handle errors gracefully', async () => {
    // Force connect mock to throw an error
    const { connect } = require('puppeteer-core/lib/puppeteer/puppeteer-core-browser.js');
    connect.mockRejectedValueOnce(new Error('Connection failed'));
    
    const result = await runPuppeteerPrototype(123);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection failed');
  });
});
