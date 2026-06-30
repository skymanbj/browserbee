/**
 * ScreenshotManager - Singleton class to manage screenshots
 * 
 * This class stores screenshots in memory and provides handles to reference them,
 * which significantly reduces token usage when sending screenshots to the LLM.
 */
export class ScreenshotManager {
  private static instance: ScreenshotManager;
  private screenshots: Map<string, any> = new Map();
  private screenshotWindowIds: Map<string, number> = new Map();
  private counter: number = 0;
  
  private constructor() {}
  
  /**
   * Get the singleton instance of ScreenshotManager
   * @returns The ScreenshotManager instance
   */
  static getInstance(): ScreenshotManager {
    if (!ScreenshotManager.instance) {
      ScreenshotManager.instance = new ScreenshotManager();
    }
    return ScreenshotManager.instance;
  }
  
  /**
   * Store a screenshot and return a handle to reference it
   * @param data The screenshot data to store
   * @param windowId Optional window ID to associate with the screenshot
   * @returns A unique handle to reference the screenshot (e.g., "screenshot#42")
   */
  storeScreenshot(data: any, windowId?: number): string {
    const id = `screenshot#${++this.counter}`;
    this.screenshots.set(id, data);
    if (windowId !== undefined && windowId !== null) {
      this.screenshotWindowIds.set(id, windowId);
    }
    return id;
  }
  
  /**
   * Get a screenshot by its handle
   * @param id The screenshot handle (e.g., "screenshot#42")
   * @returns The screenshot data, or null if not found
   */
  getScreenshot(id: string): any | null {
    return this.screenshots.get(id) || null;
  }
  
  /**
   * Check if a screenshot exists
   * @param id The screenshot handle to check
   * @returns True if the screenshot exists, false otherwise
   */
  hasScreenshot(id: string): boolean {
    return this.screenshots.has(id);
  }
  
  /**
   * Get all screenshot handles
   * @returns An array of all screenshot handles
   */
  getAllScreenshotIds(): string[] {
    return Array.from(this.screenshots.keys());
  }
  
  /**
   * Clear screenshots from memory
   * @param windowId Optional window ID to selectively clear screenshots for a window
   */
  clear(windowId?: number): void {
    if (windowId !== undefined && windowId !== null) {
      for (const [id, wId] of this.screenshotWindowIds.entries()) {
        if (wId === windowId) {
          this.screenshots.delete(id);
          this.screenshotWindowIds.delete(id);
        }
      }
    } else {
      this.screenshots.clear();
      this.screenshotWindowIds.clear();
      this.counter = 0;
    }
  }
}
