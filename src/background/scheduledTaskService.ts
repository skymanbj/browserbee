/**
 * ScheduledTaskService
 * 
 * 定时任务调度器 - 使用 chrome.alarms 实现周期性任务执行
 * 单例模式，与 ConfigManager / MemoryService 保持一致
 */

import { logWithTimestamp } from '../background/utils';
import {
  calculateNextRun,
  CreateScheduledTaskInput,
  DEFAULT_TASKS,
  getAlarmName,
  parseTaskIdFromAlarm,
  ScheduledTask,
  STORAGE_KEY,
  TaskExecutionLog,
  UpdateScheduledTaskInput
} from '../types/scheduledTask';

export class ScheduledTaskService {
  private static instance: ScheduledTaskService;
  private tasks: Map<string, ScheduledTask> = new Map();
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private executionLogs: Map<string, TaskExecutionLog[]> = new Map();
  private readonly MAX_LOGS_PER_TASK = 50;

  public static getInstance(): ScheduledTaskService {
    if (!ScheduledTaskService.instance) {
      ScheduledTaskService.instance = new ScheduledTaskService();
    }
    return ScheduledTaskService.instance;
  }

  // ==================== 初始化 ====================

  /**
   * 等待初始化完成（用于解决竞态条件）
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    return this.init();
  }

  /**
   * 初始化服务：从存储加载任务，合并默认任务，重新注册闹钟
   */
  public async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    logWithTimestamp('ScheduledTaskService: Initializing...');

    this.initPromise = (async () => {
      try {
        await this.loadFromStorage();
        await this.mergeDefaults();
        await this.syncAlarms();
        this.initialized = true;
        logWithTimestamp(`ScheduledTaskService: Initialized with ${this.tasks.size} tasks`);
      } catch (error) {
        logWithTimestamp(`ScheduledTaskService: Init error: ${error}`, 'error');
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  // ==================== CRUD 操作 ====================

  /** 获取所有任务（异步，确保初始化完成） */
  public async getAll(): Promise<ScheduledTask[]> {
    await this.ensureInitialized();
    return Array.from(this.tasks.values())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /** 获取已启用的任务（异步） */
  public async getEnabled(): Promise<ScheduledTask[]> {
    const tasks = await this.getAll();
    return tasks.filter(t => t.enabled && t.status === 'active');
  }

  /** 根据 ID 获取任务（异步） */
  public async getById(id: string): Promise<ScheduledTask | undefined> {
    await this.ensureInitialized();
    return this.tasks.get(id);
  }

  /** 创建新任务 */
  public async create(input: CreateScheduledTaskInput): Promise<ScheduledTask> {
    const now = Date.now();
    const task: ScheduledTask = {
      ...input,
      id: crypto.randomUUID(),
      enabled: true,
      status: 'active',
      runCount: 0,
      createdAt: now,
      updatedAt: now,
      isBuiltIn: false,
    };

    // 计算首次执行时间
    task.nextRunAt = calculateNextRun(task);

    this.tasks.set(task.id, task);
    await this.persist();

    // 注册闹钟
    await this.scheduleAlarm(task);

    logWithTimestamp(`ScheduledTaskService: Created task "${task.name}" (${task.id})`);
    return task;
  }

  /** 更新任务 */
  public async update(id: string, input: UpdateScheduledTaskInput): Promise<ScheduledTask | null> {
    const existing = this.tasks.get(id);
    if (!existing) return null;

    const updated: ScheduledTask = {
      ...existing,
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
      isBuiltIn: existing.isBuiltIn,
      updatedAt: Date.now(),
    };

    // 如果调度参数变了，重新计算下次执行时间
    if (input.frequency || input.interval || input.timeOfDay) {
      updated.nextRunAt = calculateNextRun(updated);
    }

    this.tasks.set(id, updated);
    await this.persist();

    // 重新注册闹钟
    if (updated.enabled && updated.status === 'active') {
      await this.scheduleAlarm(updated);
    } else {
      await this.clearAlarm(id);
    }

    logWithTimestamp(`ScheduledTaskService: Updated task "${updated.name}" (${id})`);
    return updated;
  }

  /** 删除任务 */
  public async delete(id: string): Promise<boolean> {
    const existing = this.tasks.get(id);
    if (!existing) return false;

    // 禁止删除内置任务
    if (existing.isBuiltIn) {
      logWithTimestamp(`ScheduledTaskService: Cannot delete built-in task "${id}"`, 'warn');
      return false;
    }

    this.tasks.delete(id);
    this.executionLogs.delete(id);
    await this.persist();
    await this.clearAlarm(id);

    logWithTimestamp(`ScheduledTaskService: Deleted task "${existing.name}" (${id})`);
    return true;
  }

  /** 批量删除 */
  public async deleteMany(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      const deleted = await this.delete(id);
      if (deleted) count++;
    }
    return count;
  }

  // ==================== 状态控制 ====================

  /** 启用任务 */
  public async enable(id: string): Promise<ScheduledTask | null> {
    return this.update(id, { enabled: true, status: 'active' });
  }

  /** 暂停任务 */
  public async pause(id: string): Promise<ScheduledTask | null> {
    await this.clearAlarm(id);
    return this.update(id, { enabled: false, status: 'paused' });
  }

  /** 立即执行任务（手动触发） */
  public async runNow(id: string): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task) return false;

    logWithTimestamp(`ScheduledTaskService: Manual trigger for task "${task.name}" (${id})`);
    await this.executeTask(task);
    return true;
  }

  // ==================== 闹钟生命周期管理 ====================

  /** 注册单个任务的闹钟 */
  private async scheduleAlarm(task: ScheduledTask): Promise<void> {
    if (!task.enabled || task.status !== 'active') return;

    const alarmName = getAlarmName(task.id);
    
    // 先清除旧闹钟
    try {
      await chrome.alarms.clear(alarmName);
    } catch { /* ignore */ }

    // 计算下次执行
    const nextRun = calculateNextRun(task);
    const delayInMinutes = Math.max(1, Math.ceil((nextRun - Date.now()) / 60000));

    // 根据频率注册不同的闹钟
    switch (task.frequency) {
      case 'minutes':
        chrome.alarms.create(alarmName, {
          delayInMinutes: Math.min(delayInMinutes, task.interval),
          periodInMinutes: task.interval,
        });
        break;

      case 'hours':
        chrome.alarms.create(alarmName, {
          delayInMinutes: Math.min(delayInMinutes, task.interval * 60),
          periodInMinutes: task.interval * 60,
        });
        break;

      case 'daily':
      case 'weekly':
      case 'monthly':
        // 对于非均匀间隔，只设置一次，执行时重新注册
        chrome.alarms.create(alarmName, {
          delayInMinutes,
        });
        break;
    }

    // 更新下次执行时间
    task.nextRunAt = nextRun;
    task.updatedAt = Date.now();
    await this.persist();

    logWithTimestamp(`ScheduledTaskService: Scheduled alarm "${alarmName}" in ${delayInMinutes} min`);
  }

  /** 清除单个任务的闹钟 */
  private async clearAlarm(id: string): Promise<void> {
    const alarmName = getAlarmName(id);
    try {
      await chrome.alarms.clear(alarmName);
    } catch { /* ignore */ }
  }

  /** 同步所有任务与闹钟（启动时用） */
  private async syncAlarms(): Promise<void> {
    // 清除所有旧闹钟
    await chrome.alarms.clearAll();

    // 为每个已启用的任务重新注册
    for (const task of this.tasks.values()) {
      if (task.enabled && task.status === 'active') {
        await this.scheduleAlarm(task);
      }
    }
  }

  /** 处理闹钟触发（由 background/index.ts 调用） */
  public async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    const taskId = parseTaskIdFromAlarm(alarm.name);
    if (!taskId) {
      logWithTimestamp(`ScheduledTaskService: Unknown alarm "${alarm.name}"`, 'warn');
      return;
    }

    const task = this.tasks.get(taskId);
    if (!task) {
      logWithTimestamp(`ScheduledTaskService: Task not found for alarm "${alarm.name}"`, 'warn');
      await this.clearAlarm(taskId);
      return;
    }

    logWithTimestamp(`ScheduledTaskService: Alarm fired for task "${task.name}" (${taskId})`);
    await this.executeTask(task);
  }

  // ==================== 任务执行 ====================

  /** 执行任务 */
  private async executeTask(task: ScheduledTask): Promise<void> {
    const startTime = Date.now();
    const log: TaskExecutionLog = {
      timestamp: startTime,
      result: 'success',
    };

    try {
      // 通知 UI（如果有打开的 side panel）
      this.broadcastTaskExecution(task, 'started');

      // 获取活动 tab 并执行 prompt
      const activeTabId = await this.getActiveTabId(task.targetUrlPattern);
      if (!activeTabId) {
        throw new Error('No active tab found. Please make sure at least one tab is open.');
      }

      // 动态导入 executePrompt
      const { executePrompt } = await import('../background/agentController');
      await executePrompt(task.prompt, activeTabId);

      // 更新任务状态
      task.lastRunAt = startTime;
      task.runCount = (task.runCount || 0) + 1;
      
      // 对于非周期闹钟（daily/weekly/monthly），重新注册
      if (['daily', 'weekly', 'monthly'].includes(task.frequency)) {
        task.nextRunAt = calculateNextRun(task);
        await this.scheduleAlarm(task);
      } else {
        task.nextRunAt = calculateNextRun(task);
      }

      log.duration = Date.now() - startTime;
      logWithTimestamp(`ScheduledTaskService: Task "${task.name}" completed in ${log.duration}ms`);

      // 通知 UI
      this.broadcastTaskExecution(task, 'completed', log.duration);

    } catch (error) {
      log.result = 'error';
      log.error = error instanceof Error ? error.message : String(error);
      log.duration = Date.now() - startTime;

      logWithTimestamp(`ScheduledTaskService: Task "${task.name}" failed: ${log.error}`, 'error');

      // 即使失败，也重新调度（daily/weekly/monthly）
      if (['daily', 'weekly', 'monthly'].includes(task.frequency)) {
        task.nextRunAt = calculateNextRun(task);
        await this.scheduleAlarm(task);
      }

      // 通知 UI
      this.broadcastTaskExecution(task, 'error', log.duration, log.error);
    }

    // 保存执行日志
    this.addExecutionLog(task.id, log);

    // 持久化
    task.updatedAt = Date.now();
    await this.persist();
  }

  /** 获取活动 tab ID */
  private async getActiveTabId(urlPattern?: string): Promise<number | undefined> {
    const queryOptions: chrome.tabs.QueryInfo = { active: true, lastFocusedWindow: true };
    
    if (urlPattern) {
      // 尝试匹配 URL 模式
      const allTabs = await chrome.tabs.query({});
      const matchedTab = allTabs.find(tab => tab.url && tab.url.includes(urlPattern) && tab.active);
      if (matchedTab?.id) return matchedTab.id;
      
      // 回退
      const fallback = allTabs.find(tab => tab.url && tab.url.includes(urlPattern));
      if (fallback?.id) return fallback.id;
    }

    const tabs = await chrome.tabs.query(queryOptions);
    return tabs[0]?.id;
  }

  // ==================== 存储 ====================

  /** 从 chrome.storage.local 加载 */
  private async loadFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const stored = result[STORAGE_KEY] as ScheduledTask[] | undefined;

      if (stored && Array.isArray(stored)) {
        for (const task of stored) {
          this.tasks.set(task.id, task);
        }
        logWithTimestamp(`ScheduledTaskService: Loaded ${stored.length} tasks from storage`);
      }
    } catch (error) {
      logWithTimestamp(`ScheduledTaskService: Load error: ${error}`, 'error');
    }
  }

  /** 持久化到 chrome.storage.local */
  private async persist(): Promise<void> {
    try {
      const tasks = Array.from(this.tasks.values());
      await chrome.storage.local.set({ [STORAGE_KEY]: tasks });
    } catch (error) {
      logWithTimestamp(`ScheduledTaskService: Persist error: ${error}`, 'error');
    }
  }

  /** 合并默认任务（仅在首次不存在时添加） */
  private async mergeDefaults(): Promise<void> {
    for (const defaultTask of DEFAULT_TASKS) {
      if (!this.tasks.has(defaultTask.id)) {
        this.tasks.set(defaultTask.id, { ...defaultTask });
        logWithTimestamp(`ScheduledTaskService: Added default task "${defaultTask.name}"`);
      }
    }
    await this.persist();
  }

  // ==================== 执行日志 ====================

  private addExecutionLog(taskId: string, log: TaskExecutionLog): void {
    if (!this.executionLogs.has(taskId)) {
      this.executionLogs.set(taskId, []);
    }
    const logs = this.executionLogs.get(taskId)!;
    logs.push(log);
    // 限制日志数量
    if (logs.length > this.MAX_LOGS_PER_TASK) {
      logs.splice(0, logs.length - this.MAX_LOGS_PER_TASK);
    }
  }

  /** 获取任务的执行日志 */
  public getExecutionLogs(taskId: string, limit: number = 20): TaskExecutionLog[] {
    const logs = this.executionLogs.get(taskId) || [];
    return logs.slice(-limit);
  }

  // ==================== 导出 / 导入 ====================

  /** 导出所有任务为 JSON */
  public async exportToJson(): Promise<string> {
    const tasks = (await this.getAll()).filter(t => !t.isBuiltIn);
    return JSON.stringify(tasks, null, 2);
  }

  /** 从 JSON 导入任务 */
  public async importFromJson(json: string): Promise<number> {
    const tasks = JSON.parse(json) as ScheduledTask[];
    if (!Array.isArray(tasks)) throw new Error('Invalid format: expected an array');

    let count = 0;
    for (const task of tasks) {
      // 重新生成 ID 避免冲突
      const newTask: ScheduledTask = {
        ...task,
        id: crypto.randomUUID(),
        isBuiltIn: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (!this.tasks.has(newTask.id)) {
        this.tasks.set(newTask.id, newTask);
        count++;
      }
    }

    if (count > 0) {
      await this.persist();
      await this.syncAlarms();
    }

    return count;
  }

  // ==================== UI 广播 ====================

  /** 向 UI 广播任务执行状态 */
  private broadcastTaskExecution(
    task: ScheduledTask,
    phase: 'started' | 'completed' | 'error',
    duration?: number,
    error?: string,
  ): void {
    try {
      chrome.runtime.sendMessage({
        action: 'scheduledTaskStatus',
        content: {
          taskId: task.id,
          taskName: task.name,
          phase,
          duration,
          error,
          timestamp: Date.now(),
        },
      }).catch(() => {
        // UI 可能未打开，忽略错误
      });
    } catch {
      // 忽略广播错误
    }
  }

  // ==================== 工具方法 ====================

  /** 获取任务统计 */
  public async getStats(): Promise<{ total: number; active: number; paused: number; builtIn: number }> {
    const all = await this.getAll();
    return {
      total: all.length,
      active: all.filter(t => t.enabled && t.status === 'active').length,
      paused: all.filter(t => !t.enabled || t.status === 'paused').length,
      builtIn: all.filter(t => t.isBuiltIn).length,
    };
  }

  /** 重置服务（用于测试） */
  public async reset(): Promise<void> {
    await chrome.alarms.clearAll();
    this.tasks.clear();
    this.executionLogs.clear();
    this.initialized = false;
  }
}
