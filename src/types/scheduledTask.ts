/**
 * ScheduledTask types
 * 
 * 定时任务调度器 - 使用 chrome.alarms API 实现周期性任务执行
 */

/** 调度频率类型 */
export type ScheduleFrequency = 'minutes' | 'hours' | 'daily' | 'weekly' | 'monthly';

/** 任务执行状态 */
export type TaskStatus = 'active' | 'paused';

/** 任务执行记录 */
export interface TaskExecutionLog {
  /** 执行时间戳 */
  timestamp: number;
  /** 执行结果 */
  result: 'success' | 'error';
  /** 错误消息（如果有） */
  error?: string;
  /** 执行耗时（毫秒） */
  duration?: number;
}

/** 定时任务配置 */
export interface ScheduledTask {
  /** 唯一标识 */
  id: string;
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description: string;
  /** 要执行的 prompt 内容 */
  prompt: string;
  /** 调度频率类型 */
  frequency: ScheduleFrequency;
  /** 时间间隔（与 frequency 配合使用）
   *  - minutes: 间隔分钟数
   *  - hours: 间隔小时数
   *  - daily: 每天的特定小时（0-23）
   *  - weekly: 每星期的某天（0-6，0=周日）
   *  - monthly: 每月的某天（1-31）
   */
  interval: number;
  /** 具体时间（HH:mm 格式），用于 daily 频率 */
  timeOfDay?: string;
  /** 目标 tab URL 过滤（可选），为空则使用当前活动 tab */
  targetUrlPattern?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 任务状态 */
  status: TaskStatus;
  /** 上次执行时间戳 */
  lastRunAt?: number;
  /** 下次执行时间戳 */
  nextRunAt?: number;
  /** 总执行次数 */
  runCount: number;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 是否内置任务 */
  isBuiltIn: boolean;
}

/** 创建任务时的输入（不包含自动生成的字段） */
export type CreateScheduledTaskInput = Omit<ScheduledTask, 'id' | 'enabled' | 'status' | 'lastRunAt' | 'nextRunAt' | 'runCount' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>;

/** 更新任务时的输入 */
export type UpdateScheduledTaskInput = Partial<Omit<ScheduledTask, 'id' | 'createdAt' | 'isBuiltIn'>>;

/** 存储键 */
export const STORAGE_KEY = 'browserbee_scheduled_tasks';

/** 闹钟名称前缀 */
export const ALARM_PREFIX = 'browserbee-task-';

/**
 * 从任务 ID 生成闹钟名称
 */
export function getAlarmName(taskId: string): string {
  return `${ALARM_PREFIX}${taskId}`;
}

/**
 * 从闹钟名称解析任务 ID
 */
export function parseTaskIdFromAlarm(alarmName: string): string | null {
  if (!alarmName.startsWith(ALARM_PREFIX)) return null;
  return alarmName.slice(ALARM_PREFIX.length);
}

/**
 * 计算下次执行时间
 */
export function calculateNextRun(task: Pick<ScheduledTask, 'frequency' | 'interval' | 'timeOfDay'>): number {
  const now = Date.now();
  const next = new Date(now);

  switch (task.frequency) {
    case 'minutes':
      return now + task.interval * 60 * 1000;

    case 'hours':
      return now + task.interval * 60 * 60 * 1000;

    case 'daily': {
      const [hours, minutes] = (task.timeOfDay || '00:00').split(':').map(Number);
      next.setHours(hours, minutes, 0, 0);
      // 如果今天的时间已过，推到明天
      if (next.getTime() <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next.getTime();
    }

    case 'weekly': {
      const targetDay = task.interval; // 0-6
      const currentDay = next.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      const [hours, minutes] = (task.timeOfDay || '09:00').split(':').map(Number);
      next.setDate(next.getDate() + daysUntil);
      next.setHours(hours, minutes, 0, 0);
      return next.getTime();
    }

    case 'monthly': {
      const targetDate = Math.min(task.interval, 28); // 安全上限 28
      const [hours, minutes] = (task.timeOfDay || '09:00').split(':').map(Number);
      next.setDate(targetDate);
      next.setHours(hours, minutes, 0, 0);
      // 如果本月已过，推到下个月
      if (next.getTime() <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      return next.getTime();
    }

    default:
      return now + 60 * 1000; // 默认 1 分钟后
  }
}

/** 内置默认任务 */
export const DEFAULT_TASKS: ScheduledTask[] = [
  {
    id: 'default-memory-consolidation',
    name: '记忆整合',
    description: '定期将当前会话经验整合到长期记忆中',
    prompt: '请回顾我们刚才的对话，提取出有价值的经验、技巧和知识，整理成结构化的记忆条目，通过 memoryTools 存储到长期记忆中。',
    frequency: 'hours',
    interval: 2,
    enabled: false,
    status: 'paused',
    runCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: 'default-summary-report',
    name: '定期摘要报告',
    description: '生成当前页面的定期摘要报告',
    prompt: '请分析当前页面的内容，生成一份简洁的结构化摘要报告，包括主要主题、关键数据和要点。',
    frequency: 'daily',
    interval: 1,
    timeOfDay: '18:00',
    enabled: false,
    status: 'paused',
    runCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },
];
