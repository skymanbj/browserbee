import { MemoryService, AgentMemory } from '../memoryService';
import { PromptTemplateService } from '../promptTemplateService';
import { PromptTemplate } from '../../types/promptTemplate';
import { ScheduledTask } from '../../types/scheduledTask';
import { Session } from '../../types/session';

export interface CloudSyncProvider {
  upload(data: string): Promise<{ success: boolean; error?: string }>;
  download(): Promise<{ success: boolean; data: string; error?: string }>;
}

export interface BackupData {
  version: string;
  backupTime: number;
  memories?: AgentMemory[];
  prompts?: PromptTemplate[];
  tasks?: ScheduledTask[];
  sessions?: Session[];
  settings?: {
    sync?: Record<string, any>;
    local?: Record<string, any>;
  };
}

const EXCLUDED_SYNC_KEYS = [
  'syncType',
  'webdavUrl',
  'webdavUsername',
  'webdavPassword',
  'gdriveClientId',
  'gdriveClientSecret',
  'gdriveAccessToken',
  'gdriveRefreshToken',
  'gdriveTokenExpiry',
];

const KEYS_TO_EXCLUDE_FROM_LOCAL = [
  'browserbee_scheduled_tasks',
  'browserbee_sessions',
  'browserbee_prompt_templates',
  ...EXCLUDED_SYNC_KEYS
];

/**
 * SyncManager manages exporting, restoring, and smart merging of all user data
 */
export class SyncManager {
  private static instance: SyncManager;

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  private constructor() {}

  /**
   * Package all local user data (memories, prompts, tasks, sessions, settings) into a single object,
   * excluding cloud sync credentials.
   */
  public async exportAllData(): Promise<BackupData> {
    const memoryService = MemoryService.getInstance();
    await memoryService.init();
    const memories = await memoryService.getAllMemories();

    const promptService = PromptTemplateService.getInstance();
    const prompts = (await promptService.getAll()).filter(p => !p.isBuiltIn);

    const localData = await chrome.storage.local.get(null);
    const syncData = await chrome.storage.sync.get(null);

    const tasks = (localData['browserbee_scheduled_tasks'] as ScheduledTask[] || []).filter(t => !t.isBuiltIn);
    const sessions = localData['browserbee_sessions'] as Session[] || [];

    // Filter settings - exclude sync keys
    const filteredSyncSettings: Record<string, any> = {};
    for (const [key, val] of Object.entries(syncData)) {
      if (!EXCLUDED_SYNC_KEYS.includes(key)) {
        filteredSyncSettings[key] = val;
      }
    }

    const filteredLocalSettings: Record<string, any> = {};
    for (const [key, val] of Object.entries(localData)) {
      if (!KEYS_TO_EXCLUDE_FROM_LOCAL.includes(key)) {
        filteredLocalSettings[key] = val;
      }
    }

    return {
      version: '0.2.0',
      backupTime: Date.now(),
      memories,
      prompts,
      tasks,
      sessions,
      settings: {
        sync: filteredSyncSettings,
        local: filteredLocalSettings
      }
    };
  }

  /**
   * Overwrite all local user data with the cloud backup data.
   */
  public async restoreAllData(data: BackupData): Promise<void> {
    // 1. Restore Memories
    const memoryService = MemoryService.getInstance();
    await memoryService.init();
    await memoryService.clearMemories();
    if (data.memories && Array.isArray(data.memories)) {
      for (const mem of data.memories) {
        delete mem.id;
        await memoryService.storeMemory(mem);
      }
    }

    // 2. Restore Prompts
    if (data.prompts && Array.isArray(data.prompts)) {
      const promptService = PromptTemplateService.getInstance();
      // Use prompt import helper
      await promptService.importFromJson(JSON.stringify(data.prompts));
    }

    // 3. Restore Scheduled Tasks (send to background to re-initialize alarms properly)
    if (data.tasks && Array.isArray(data.tasks)) {
      await chrome.runtime.sendMessage({
        action: 'scheduledTaskImport',
        json: JSON.stringify(data.tasks)
      });
    }

    // 4. Restore Sessions (send to background for import helper)
    if (data.sessions && Array.isArray(data.sessions)) {
      await chrome.runtime.sendMessage({
        action: 'sessionImport',
        json: JSON.stringify({ sessions: data.sessions })
      });
    }

    // 5. Restore Settings
    if (data.settings) {
      if (data.settings.sync) {
        await chrome.storage.sync.set(data.settings.sync);
      }
      if (data.settings.local) {
        await chrome.storage.local.set(data.settings.local);
      }
      // Broadcast configuration changes to update active background instances
      chrome.runtime.sendMessage({ action: 'providerConfigChanged' }).catch(() => {});
    }
  }

  /**
   * Smart merge local user data with cloud backup data, then upload the merged data back.
   */
  public async mergeAllData(provider: CloudSyncProvider): Promise<{ uploaded: boolean; details: string }> {
    const downloadRes = await provider.download();
    if (!downloadRes.success) {
      // If file does not exist, consider it an upload-only or first sync scenario
      if (downloadRes.error?.includes('404') || downloadRes.error?.includes('not found') || downloadRes.error?.includes('does not exist')) {
        const localData = await this.exportAllData();
        const uploadRes = await provider.upload(JSON.stringify(localData, null, 2));
        if (!uploadRes.success) {
          throw new Error(uploadRes.error || 'Failed to upload initial data');
        }
        return { uploaded: true, details: 'Cloud backup created for first sync' };
      }
      throw new Error(downloadRes.error || 'Failed to download data for merge');
    }

    let cloudData: BackupData;
    try {
      cloudData = JSON.parse(downloadRes.data);
    } catch {
      throw new Error('Downloaded cloud data is not valid JSON');
    }

    // 1. Merge Memories
    const memoryService = MemoryService.getInstance();
    await memoryService.init();
    const localMemories = await memoryService.getAllMemories();
    const cloudMemories = cloudData.memories || [];
    const mergedMemories = [...localMemories];
    let newMemoriesCount = 0;

    for (const cloudMem of cloudMemories) {
      const existing = mergedMemories.find(m =>
        m.domain.toLowerCase() === cloudMem.domain.toLowerCase() &&
        m.taskDescription.toLowerCase() === cloudMem.taskDescription.toLowerCase()
      );
      if (existing) {
        if ((cloudMem.createdAt || 0) > (existing.createdAt || 0)) {
          existing.toolSequence = cloudMem.toolSequence;
          existing.createdAt = cloudMem.createdAt;
          newMemoriesCount++;
        }
      } else {
        mergedMemories.push({
          domain: cloudMem.domain,
          taskDescription: cloudMem.taskDescription,
          toolSequence: cloudMem.toolSequence,
          createdAt: cloudMem.createdAt
        });
        newMemoriesCount++;
      }
    }
    await memoryService.clearMemories();
    for (const mem of mergedMemories) {
      delete mem.id;
      await memoryService.storeMemory(mem);
    }

    // 2. Merge Prompts (based on ID and updatedAt)
    const promptService = PromptTemplateService.getInstance();
    const localPrompts = await promptService.getAll();
    const cloudPrompts = cloudData.prompts || [];
    const mergedPrompts = [...localPrompts];
    let newPromptsCount = 0;

    for (const cloudP of cloudPrompts) {
      const idx = mergedPrompts.findIndex(p => p.id === cloudP.id);
      if (idx >= 0) {
        const existing = mergedPrompts[idx];
        if ((cloudP.updatedAt || 0) > (existing.updatedAt || 0)) {
          mergedPrompts[idx] = cloudP;
          newPromptsCount++;
        }
      } else {
        mergedPrompts.push(cloudP);
        newPromptsCount++;
      }
    }
    await chrome.storage.local.set({ ['browserbee_prompt_templates']: mergedPrompts });

    // 3. Merge Scheduled Tasks (based on ID and updatedAt)
    const localData = await chrome.storage.local.get(null);
    const localTasks = localData['browserbee_scheduled_tasks'] as ScheduledTask[] || [];
    const cloudTasks = cloudData.tasks || [];
    const mergedTasks = [...localTasks];
    let newTasksCount = 0;

    for (const cloudT of cloudTasks) {
      const idx = mergedTasks.findIndex(t => t.id === cloudT.id);
      if (idx >= 0) {
        const existing = mergedTasks[idx];
        if ((cloudT.updatedAt || 0) > (existing.updatedAt || 0)) {
          mergedTasks[idx] = cloudT;
          newTasksCount++;
        }
      } else {
        mergedTasks.push(cloudT);
        newTasksCount++;
      }
    }
    await chrome.storage.local.set({ ['browserbee_scheduled_tasks']: mergedTasks });
    // Tell background to re-initialize task maps and alarms
    await chrome.runtime.sendMessage({ action: 'scheduledTaskGetAll' }).catch(() => {});

    // 4. Merge Sessions (based on ID and updatedAt)
    const localSessions = localData['browserbee_sessions'] as Session[] || [];
    const cloudSessions = cloudData.sessions || [];
    const mergedSessions = [...localSessions];
    let newSessionsCount = 0;

    for (const cloudS of cloudSessions) {
      const idx = mergedSessions.findIndex(s => s.id === cloudS.id);
      if (idx >= 0) {
        const existing = mergedSessions[idx];
        if ((cloudS.updatedAt || 0) > (existing.updatedAt || 0)) {
          mergedSessions[idx] = cloudS;
          newSessionsCount++;
        }
      } else {
        mergedSessions.push(cloudS);
        newSessionsCount++;
      }
    }
    await chrome.storage.local.set({ ['browserbee_sessions']: mergedSessions });

    // 5. Merge Settings (cloud settings overwrite/merge local settings)
    if (cloudData.settings) {
      if (cloudData.settings.sync) {
        const currentSync = await chrome.storage.sync.get(null);
        const mergedSync = { ...currentSync, ...cloudData.settings.sync };
        await chrome.storage.sync.set(mergedSync);
      }
      if (cloudData.settings.local) {
        const currentLocal = await chrome.storage.local.get(null);
        const mergedLocal = { ...currentLocal, ...cloudData.settings.local };
        // Ensure no data keys are corrupted
        for (const key of KEYS_TO_EXCLUDE_FROM_LOCAL) {
          delete mergedLocal[key];
        }
        await chrome.storage.local.set(mergedLocal);
      }
      chrome.runtime.sendMessage({ action: 'providerConfigChanged' }).catch(() => {});
    }

    // 6. Export the newly merged state and upload back to cloud
    const finalMergedData = await this.exportAllData();
    const uploadRes = await provider.upload(JSON.stringify(finalMergedData, null, 2));
    if (!uploadRes.success) {
      throw new Error(uploadRes.error || 'Failed to upload merged state to cloud');
    }

    const detailMsg = `Merged: ${newMemoriesCount} memories, ${newPromptsCount} templates, ${newTasksCount} tasks, ${newSessionsCount} sessions updated from cloud.`;
    return { uploaded: true, details: detailMsg };
  }
}
