import { logWithTimestamp } from '../background/utils';
import {
    DEFAULT_TEMPLATES,
    PromptTemplate,
    STORAGE_KEY,
} from '../types/promptTemplate';

/**
 * Service for managing prompt templates stored in chrome.storage.local.
 *
 * Templates are stored under the key `browserbee_prompt_templates` as an array
 * of PromptTemplate objects. Built-in defaults are automatically seeded on the
 * first call to loadTemplates() if no user data exists.
 *
 * Usage:
 *   const service = PromptTemplateService.getInstance();
 *   const templates = await service.getAll();
 */
export class PromptTemplateService {
  private static instance: PromptTemplateService;

  /**
   * In-memory cache of loaded templates. Refreshed on every write operation.
   */
  private cache: PromptTemplate[] | null = null;

  public static getInstance(): PromptTemplateService {
    if (!PromptTemplateService.instance) {
      PromptTemplateService.instance = new PromptTemplateService();
    }
    return PromptTemplateService.instance;
  }

  private constructor() {}

  // ── Read ────────────────────────────────────────────────────

  /**
   * Load all templates from storage. Seeds defaults when storage is empty.
   */
  async getAll(): Promise<PromptTemplate[]> {
    if (this.cache) {
      return this.cache;
    }

    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        const stored = result[STORAGE_KEY] as PromptTemplate[] | undefined;

        if (!stored || !Array.isArray(stored) || stored.length === 0) {
          // First run: seed with defaults
          logWithTimestamp('Seeding default prompt templates');
          this.cache = [...DEFAULT_TEMPLATES];
          this.persist(this.cache).then(() => resolve(this.cache!));
          return;
        }

        // Merge in any new built-in defaults that aren't already present
        const merged = this.mergeDefaults(stored);
        if (merged.length !== stored.length) {
          logWithTimestamp(`Merged ${merged.length - stored.length} new default templates`);
          this.cache = merged;
          this.persist(this.cache).then(() => resolve(this.cache!));
        } else {
          this.cache = stored;
          resolve(this.cache);
        }
      });
    });
  }

  /**
   * Get a single template by ID.
   */
  async getById(id: string): Promise<PromptTemplate | undefined> {
    const all = await this.getAll();
    return all.find((t) => t.id === id);
  }

  // ── Create / Update ─────────────────────────────────────────

  /**
   * Save (create or update) a template.
   * If template.id already exists, it will be updated.
   * If it doesn't, it will be added.
   */
  async save(template: PromptTemplate): Promise<PromptTemplate> {
    const all = await this.getAll();
    const idx = all.findIndex((t) => t.id === template.id);

    const now = Date.now();
    const updated = {
      ...template,
      updatedAt: now,
      createdAt: template.createdAt || now,
    };

    if (idx >= 0) {
      all[idx] = updated;
    } else {
      all.push(updated);
    }

    this.cache = all;
    await this.persist(all);
    return updated;
  }

  /**
   * Create a new template with an auto-generated ID.
   * Returns the created template with the assigned ID.
   */
  async create(data: {
    name: string;
    prompt: string;
    category?: string;
  }): Promise<PromptTemplate> {
    const now = Date.now();
    const template: PromptTemplate = {
      id: `prompt_${now}`,
      name: data.name.trim(),
      prompt: data.prompt.trim(),
      category: data.category?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      isBuiltIn: false,
    };
    return this.save(template);
  }

  // ── Delete ──────────────────────────────────────────────────

  /**
   * Delete a template by ID. Built-in templates are skipped (protected).
   */
  async delete(id: string): Promise<boolean> {
    const all = await this.getAll();
    const target = all.find((t) => t.id === id);

    if (!target) return false;
    if (target.isBuiltIn) {
      logWithTimestamp(`Cannot delete built-in template "${id}"`, 'warn');
      return false;
    }

    const filtered = all.filter((t) => t.id !== id);
    this.cache = filtered;
    await this.persist(filtered);
    return true;
  }

  /**
   * Delete multiple templates at once. Built-in templates are skipped.
   */
  async deleteMany(ids: string[]): Promise<number> {
    const all = await this.getAll();
    const filtered = all.filter((t) => !ids.includes(t.id) || t.isBuiltIn);
    const deletedCount = all.length - filtered.length;
    if (deletedCount === 0) return 0;

    this.cache = filtered;
    await this.persist(filtered);
    return deletedCount;
  }

  // ── Export / Import ─────────────────────────────────────────

  /**
   * Export all non-built-in templates as a JSON string.
   */
  async exportToJson(): Promise<string> {
    const all = await this.getAll();
    const userTemplates = all.filter((t) => !t.isBuiltIn);
    return JSON.stringify(userTemplates, null, 2);
  }

  /**
   * Import templates from a JSON string.
   * Returns the count of successfully imported templates.
   */
  async importFromJson(json: string): Promise<number> {
    let data: any[];
    try {
      data = JSON.parse(json);
    } catch {
      throw new Error('Invalid JSON format');
    }

    if (!Array.isArray(data)) {
      throw new Error('Expected an array of prompt templates');
    }

    const all = await this.getAll();
    let importedCount = 0;

    for (const item of data) {
      if (!item.name || !item.prompt) {
        logWithTimestamp('Skipping invalid template entry', 'warn');
        continue;
      }

      const now = Date.now();
      const template: PromptTemplate = {
        id: item.id || `prompt_imported_${now}_${Math.random().toString(36).slice(2, 8)}`,
        name: item.name.trim(),
        prompt: item.prompt.trim(),
        category: item.category?.trim() || undefined,
        createdAt: item.createdAt || now,
        updatedAt: now,
        isBuiltIn: false,
      };

      // Overwrite if existing user template with same ID
      const existingIdx = all.findIndex(
        (t) => t.id === template.id && !t.isBuiltIn
      );
      if (existingIdx >= 0) {
        all[existingIdx] = template;
      } else {
        all.push(template);
      }
      importedCount++;
    }

    this.cache = all;
    await this.persist(all);
    return importedCount;
  }

  // ── Internal helpers ────────────────────────────────────────

  /**
   * Merge any new built-in defaults into an existing stored array.
   * New defaults (not already present by ID) are appended.
   */
  private mergeDefaults(stored: PromptTemplate[]): PromptTemplate[] {
    const existingIds = new Set(stored.map((t) => t.id));
    const missing = DEFAULT_TEMPLATES.filter((d) => !existingIds.has(d.id));
    if (missing.length === 0) return stored;
    return [...stored, ...missing];
  }

  /**
   * Persist the cache to chrome.storage.local.
   */
  private async persist(templates: PromptTemplate[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: templates }, () => {
        resolve();
      });
    });
  }
}