import { connect, ExtensionTransport } from 'puppeteer-core/lib/puppeteer/puppeteer-core-browser.js';

export interface PuppeteerPrototypeResult {
  success: boolean;
  title?: string;
  url?: string;
  screenshotLength?: number;
  evaluatedResult?: any;
  error?: string;
}

/**
 * A prototype function to evaluate Puppeteer's ExtensionTransport connection
 * and capabilities in a Chrome Extension context.
 */
export async function runPuppeteerPrototype(tabId: number): Promise<PuppeteerPrototypeResult> {
  try {
    console.log(`[Puppeteer Prototype] Attempting connection to tab ${tabId}`);
    
    // 1. Establish connection to the tab via ExtensionTransport
    const browser = await connect({
      transport: await ExtensionTransport.connectTab(tabId),
    });
    
    console.log(`[Puppeteer Prototype] Connected successfully to tab ${tabId}`);
    
    // 2. Retrieve page instances from browser context
    const pages = await browser.pages();
    if (pages.length === 0) {
      throw new Error("No pages found in browser context");
    }
    const page = pages[0];
    
    // 3. Perform basic operations: Get title & URL
    const title = await page.title();
    const url = page.url();
    console.log(`[Puppeteer Prototype] Current Title: "${title}", URL: "${url}"`);
    
    // 4. Perform evaluate execution
    const evaluatedResult = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentTitle: document.title,
      };
    });
    console.log(`[Puppeteer Prototype] Evaluated result:`, evaluatedResult);
    
    // 5. Take screenshot (viewport only, jpeg)
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 40,
    });
    const screenshotLength = screenshotBuffer.length;
    console.log(`[Puppeteer Prototype] Taken screenshot of size ${screenshotLength} bytes`);
    
    // 6. Close browser session/transport
    await browser.close();
    console.log(`[Puppeteer Prototype] Browser connection closed`);
    
    return {
      success: true,
      title,
      url,
      screenshotLength,
      evaluatedResult,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Puppeteer Prototype] Error during execution:`, error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
