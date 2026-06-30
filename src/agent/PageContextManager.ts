import type { Page, BrowserContext } from "playwright-crx";

/**
 * PageContextManager is responsible for tracking the currently active page.
 * This ensures that all tools operate on the correct page, even after tab switching.
 */
export class PageContextManager {
  private static instance: PageContextManager;
  private activePages = new Map<BrowserContext, Page>();

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get the singleton instance of PageContextManager
   */
  public static getInstance(): PageContextManager {
    if (!PageContextManager.instance) {
      PageContextManager.instance = new PageContextManager();
    }
    return PageContextManager.instance;
  }

  /**
   * Set the current active page
   * @param page The page to set as active
   */
  public setCurrentPage(page: Page): void {
    if (!page) {
      console.log("PageContextManager: Page is null or undefined");
      return;
    }
    const context = page.context();
    this.activePages.set(context, page);
    console.log("PageContextManager: Active page updated");
  }

  /**
   * Get the current active page
   * @param fallbackPage Fallback page to use if no current page is set
   * @returns The current active page or the fallback page
   */
  public getCurrentPage(fallbackPage: Page): Page {
    if (!fallbackPage) return null as any;
    const context = fallbackPage.context();
    return this.activePages.get(context) || fallbackPage;
  }

  /**
   * Initialize the PageContextManager with an initial page
   * @param initialPage The initial page to set
   */
  public initialize(initialPage: Page): void {
    if (!initialPage) return;
    const context = initialPage.context();
    if (!this.activePages.has(context)) {
      this.activePages.set(context, initialPage);
      console.log("PageContextManager: Initialized with initial page");
    }
  }

  /**
   * Reset the PageContextManager
   */
  public reset(context?: BrowserContext | Page): void {
    if (context) {
      const targetContext = 'context' in context && typeof context.context === 'function' 
        ? context.context() 
        : context as BrowserContext;
      this.activePages.delete(targetContext);
    } else {
      this.activePages.clear();
    }
    console.log("PageContextManager: Reset");
  }
}

/**
 * Helper function to get the current active page
 * @param fallbackPage Fallback page to use if no current page is set
 * @returns The current active page or the fallback page
 */
export function getCurrentPage(fallbackPage: Page): Page {
  return PageContextManager.getInstance().getCurrentPage(fallbackPage);
}

/**
 * Helper function to set the current active page
 * @param page The page to set as active
 */
export function setCurrentPage(page: Page): void {
  PageContextManager.getInstance().setCurrentPage(page);
}

/**
 * Helper function to initialize the PageContextManager
 * @param initialPage The initial page to set
 */
export function initializePageContext(initialPage: Page): void {
  PageContextManager.getInstance().initialize(initialPage);
}

/**
 * Helper function to reset the PageContextManager
 */
export function resetPageContext(context?: BrowserContext | Page): void {
  PageContextManager.getInstance().reset(context);
}
