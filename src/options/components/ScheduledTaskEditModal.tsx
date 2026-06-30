import React, { useEffect, useState } from 'react';
import { CreateScheduledTaskInput, ScheduledTask, ScheduleFrequency } from '../../types/scheduledTask';

interface ScheduledTaskEditModalProps {
    task: ScheduledTask | null;
    onSave: (input: CreateScheduledTaskInput) => void;
    onClose: () => void;
}

export function ScheduledTaskEditModal({ task, onSave, onClose }: ScheduledTaskEditModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [prompt, setPrompt] = useState('');
    const [frequency, setFrequency] = useState<ScheduleFrequency>('hours');
    const [interval, setInterval] = useState<number>(1);
    const [timeOfDay, setTimeOfDay] = useState('09:00');
    const [targetUrlPattern, setTargetUrlPattern] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (task) {
            setName(task.name);
            setDescription(task.description);
            setPrompt(task.prompt);
            setFrequency(task.frequency);
            setInterval(task.interval);
            setTimeOfDay(task.timeOfDay || '09:00');
            setTargetUrlPattern(task.targetUrlPattern || '');
        }
    }, [task]);

    // Pre-fill default prompt templates
    const fillExamplePrompt = (type: string) => {
        switch (type) {
            case 'summary':
                setPrompt('请分析当前页面的内容，生成一份简洁的结构化摘要报告，包括主要主题、关键数据和要点。');
                setDescription('生成当前页面的定期摘要报告');
                break;
            case 'monitor':
                setPrompt('请分析当前页面的内容变化，检查是否有新的重要信息、更新或异常。如果有重要变化，请总结出来。');
                setDescription('监控页面内容变化');
                break;
            case 'memory':
                setPrompt('请回顾我们刚才的对话，提取出有价值的经验、技巧和知识，整理成结构化的记忆条目，通过 memoryTools 存储到长期记忆中。');
                setDescription('定期将对话经验整合到长期记忆');
                break;
            case 'data':
                setPrompt('请提取当前页面中的关键数据（表格、列表、统计数据），并以结构化格式输出。');
                setDescription('提取页面结构化数据');
                break;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !prompt.trim()) return;

        setSaving(true);
        try {
            onSave({
                name: name.trim(),
                description: description.trim(),
                prompt: prompt.trim(),
                frequency,
                interval,
                timeOfDay: ['daily', 'weekly', 'monthly'].includes(frequency) ? timeOfDay : undefined,
                targetUrlPattern: targetUrlPattern.trim() || undefined,
            });
        } finally {
            setSaving(false);
        }
    };

    const isValid = name.trim() && prompt.trim() && interval > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="modal-box max-w-2xl p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 pb-4 border-b border-base-300">
                    <h3 className="font-bold text-xl">
                        {task ? '编辑定时任务' : '新建定时任务'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Name */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">任务名称 *</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered"
                            placeholder="例如：每日摘要报告"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">任务描述</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered"
                            placeholder="简要描述这个任务的目的"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Prompt */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">执行指令 (Prompt) *</span>
                        </label>
                        <textarea
                            className="textarea textarea-bordered min-h-[120px] font-mono text-sm"
                            placeholder="输入要 AI 执行的指令..."
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            required
                        />
                    </div>

                    {/* Quick fill templates */}
                    <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-base-content/60 self-center">快速填充:</span>
                        <button type="button" className="btn btn-xs btn-ghost" onClick={() => fillExamplePrompt('summary')}>📄 摘要</button>
                        <button type="button" className="btn btn-xs btn-ghost" onClick={() => fillExamplePrompt('monitor')}>👀 监控</button>
                        <button type="button" className="btn btn-xs btn-ghost" onClick={() => fillExamplePrompt('memory')}>🧠 记忆</button>
                        <button type="button" className="btn btn-xs btn-ghost" onClick={() => fillExamplePrompt('data')}>📊 数据</button>
                    </div>

                    {/* Schedule */}
                    <div className="card bg-base-200 p-4">
                        <label className="label">
                            <span className="label-text font-medium">调度配置</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Frequency */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">频率</span>
                                </label>
                                <select
                                    className="select select-bordered"
                                    value={frequency}
                                    onChange={e => setFrequency(e.target.value as ScheduleFrequency)}
                                >
                                    <option value="minutes">分钟</option>
                                    <option value="hours">小时</option>
                                    <option value="daily">每天</option>
                                    <option value="weekly">每周</option>
                                    <option value="monthly">每月</option>
                                </select>
                            </div>

                            {/* Interval */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">
                                        {frequency === 'minutes' ? '间隔（分钟）' :
                                            frequency === 'hours' ? '间隔（小时）' :
                                                frequency === 'daily' ? '时间' :
                                                    frequency === 'weekly' ? '星期几' :
                                                        '每月的第几天'}
                                    </span>
                                </label>
                                {['daily'].includes(frequency) ? (
                                    <input
                                        type="time"
                                        className="input input-bordered"
                                        value={timeOfDay}
                                        onChange={e => setTimeOfDay(e.target.value)}
                                    />
                                ) : (
                                    <input
                                        type="number"
                                        className="input input-bordered"
                                        min={frequency === 'minutes' || frequency === 'hours' ? 1 : frequency === 'weekly' ? 0 : 1}
                                        max={frequency === 'weekly' ? 6 : 28}
                                        value={interval}
                                        onChange={e => setInterval(Number(e.target.value))}
                                    />
                                )}
                            </div>

                            {/* Time for non-daily */}
                            {['weekly', 'monthly'].includes(frequency) && (
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">时间</span>
                                    </label>
                                    <input
                                        type="time"
                                        className="input input-bordered"
                                        value={timeOfDay}
                                        onChange={e => setTimeOfDay(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Target URL */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">目标 URL（可选）</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered"
                            placeholder="留空则使用当前活动标签页。例如：github.com"
                            value={targetUrlPattern}
                            onChange={e => setTargetUrlPattern(e.target.value)}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-base-300">
                        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
                            取消
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!isValid || saving}>
                            {saving ? (
                                <><span className="loading loading-spinner loading-sm"></span> 保存中...</>
                            ) : (
                                task ? '保存修改' : '创建任务'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
