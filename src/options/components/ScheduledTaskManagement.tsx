import { useCallback, useEffect, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { ScheduledTask } from '../../types/scheduledTask';
import { ScheduledTaskEditModal } from './ScheduledTaskEditModal';

/**
 * 定时任务管理页面
 */
export function ScheduledTaskManagement() {
    const language = useAppSelector((state) => state.settings.language);

    const t = (key: string): string => {
        const cleanKey = key.trim();
        const translationDict: Record<string, Record<string, string>> = {
            'Scheduled Tasks': { zh: '定时任务', en: 'Scheduled Tasks' }
        };
        const translated = translationDict[cleanKey]?.[language];
        return translated ?? key;
    };
    const [tasks, setTasks] = useState<ScheduledTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');
    const [editTask, setEditTask] = useState<ScheduledTask | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const showStatus = useCallback((type: 'success' | 'error', text: string) => {
        setStatusMsg({ type, text });
        setTimeout(() => setStatusMsg(null), 3000);
    }, []);

    const loadTasks = useCallback(async () => {
        setLoading(true);
        try {
            const response = await chrome.runtime.sendMessage({ action: 'scheduledTaskGetAll' });
            if (response?.success && response.tasks) {
                setTasks(response.tasks);
            }
        } catch (error: any) {
            showStatus('error', `加载失败: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    }, [showStatus]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const handleCreate = async (input: any) => {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'scheduledTaskCreate',
                task: input,
            });
            if (response?.success) {
                showStatus('success', '定时任务创建成功');
                setShowEditModal(false);
                await loadTasks();
            } else {
                showStatus('error', response?.error || '创建失败');
            }
        } catch (error: any) {
            showStatus('error', `创建失败: ${error.message || error}`);
        }
    };

    const handleUpdate = async (taskId: string, updates: any) => {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'scheduledTaskUpdate',
                taskId,
                updates,
            });
            if (response?.success) {
                showStatus('success', '定时任务更新成功');
                setShowEditModal(false);
                setEditTask(null);
                await loadTasks();
            } else {
                showStatus('error', response?.error || '更新失败');
            }
        } catch (error: any) {
            showStatus('error', `更新失败: ${error.message || error}`);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'scheduledTaskDelete',
                taskId: id,
            });
            if (response?.success) {
                showStatus('success', '定时任务已删除');
                await loadTasks();
            } else {
                showStatus('error', response?.error || '删除失败');
            }
        } catch (error: any) {
            showStatus('error', `删除失败: ${error.message || error}`);
        }
        setDeleteConfirmId(null);
    };

    const handleToggle = async (task: ScheduledTask) => {
        if (task.enabled && task.status === 'active') {
            await chrome.runtime.sendMessage({
                action: 'scheduledTaskPause',
                taskId: task.id,
            });
        } else {
            await chrome.runtime.sendMessage({
                action: 'scheduledTaskEnable',
                taskId: task.id,
            });
        }
        await loadTasks();
    };

    const handleRunNow = async (taskId: string) => {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'scheduledTaskRunNow',
                taskId,
            });
            if (response?.success) {
                showStatus('success', '任务已触发执行');
            } else {
                showStatus('error', response?.error || '触发失败');
            }
        } catch (error: any) {
            showStatus('error', `触发失败: ${error.message || error}`);
        }
    };

    const handleExport = async () => {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'scheduledTaskExport' });
            if (response?.success && response.json) {
                const blob = new Blob([response.json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `browserbee-scheduled-tasks-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showStatus('success', '导出成功');
            }
        } catch (error: any) {
            showStatus('error', `导出失败: ${error.message || error}`);
        }
    };

    const handleImport = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const response = await chrome.runtime.sendMessage({
                    action: 'scheduledTaskImport',
                    json: text,
                });
                if (response?.success) {
                    showStatus('success', `成功导入 ${response.count} 个定时任务`);
                    await loadTasks();
                } else {
                    showStatus('error', response?.error || '导入失败');
                }
            } catch (error: any) {
                showStatus('error', `导入失败: ${error.message || error}`);
            }
        };
        input.click();
    };

    const openEdit = (task?: ScheduledTask) => {
        setEditTask(task || null);
        setShowEditModal(true);
    };

    // Filter tasks
    const filteredTasks = tasks.filter(task => {
        if (filter === 'active' && (!task.enabled || task.status !== 'active')) return false;
        if (filter === 'paused' && (task.enabled && task.status === 'active')) return false;
        if (search && !task.name.toLowerCase().includes(search.toLowerCase()) &&
            !task.description.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const stats = {
        total: tasks.length,
        active: tasks.filter(t => t.enabled && t.status === 'active').length,
        paused: tasks.filter(t => !t.enabled || t.status === 'paused').length,
    };

    const formatNextRun = (task: ScheduledTask): string => {
        if (!task.nextRunAt) return '-';
        const diff = task.nextRunAt - Date.now();
        if (diff < 0) return '尽快执行';
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins} 分钟后`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} 小时后`;
        return new Date(task.nextRunAt).toLocaleDateString('zh-CN', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getFrequencyLabel = (task: ScheduledTask): string => {
        switch (task.frequency) {
            case 'minutes': return `每 ${task.interval} 分钟`;
            case 'hours': return `每 ${task.interval} 小时`;
            case 'daily': return `每天 ${task.timeOfDay || '00:00'}`;
            case 'weekly': {
                const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                return `每${days[task.interval]} ${task.timeOfDay || '09:00'}`;
            }
            case 'monthly': return `每月 ${task.interval} 日 ${task.timeOfDay || '09:00'}`;
            default: return '-';
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="loading loading-spinner loading-lg text-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">{t('定时任务调度器')}</h2>
                <p className="text-base-content/70 text-sm">
                    {t('使用 chrome.alarms 实现周期性任务自动执行。可定时执行 AI 指令，如自动摘要、数据监控等。')}
                </p>
            </div>

            {/* Status message */}
            {statusMsg && (
                <div className={`alert alert-${statusMsg.type === 'success' ? 'success' : 'error'} mb-4 shadow-lg`}>
                    <span>{statusMsg.text}</span>
                </div>
            )}

            {/* Stats */}
            <div className="stats shadow mb-6 w-full">
                <div className="stat">
                    <div className="stat-title">{t('全部任务')}</div>
                    <div className="stat-value">{stats.total}</div>
                </div>
                <div className="stat">
                    <div className="stat-title text-success">{t('运行中')}</div>
                    <div className="stat-value text-success">{stats.active}</div>
                </div>
                <div className="stat">
                    <div className="stat-title text-warning">{t('已暂停')}</div>
                    <div className="stat-value text-warning">{stats.paused}</div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">
                <button className="btn btn-primary btn-sm gap-2" onClick={() => openEdit()}>
                    ➕ {t('新建任务')}
                </button>
                <button className="btn btn-ghost btn-sm gap-2" onClick={handleExport}>
                    📤 {t('导出')}
                </button>
                <button className="btn btn-ghost btn-sm gap-2" onClick={handleImport}>
                    📥 {t('导入')}
                </button>
                <button className="btn btn-ghost btn-sm gap-2" onClick={loadTasks}>
                    🔄 {t('刷新')}
                </button>
                <div className="divider divider-horizontal mx-1"></div>
                <input
                    type="text"
                    placeholder={t('搜索任务名称或描述...')}
                    className="input input-bordered input-sm w-64"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <div className="join">
                    <button
                        className={`join-item btn btn-sm ${filter === 'all' ? 'btn-active' : ''}`}
                        onClick={() => setFilter('all')}
                    >{t('全部')}</button>
                    <button
                        className={`join-item btn btn-sm ${filter === 'active' ? 'btn-active' : ''}`}
                        onClick={() => setFilter('active')}
                    >{t('运行中')}</button>
                    <button
                        className={`join-item btn btn-sm ${filter === 'paused' ? 'btn-active' : ''}`}
                        onClick={() => setFilter('paused')}
                    >{t('已暂停')}</button>
                </div>
            </div>

            {/* Task List */}
            {filteredTasks.length === 0 ? (
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body items-center text-center py-12">
                        {search || filter !== 'all' ? (
                            <>
                                <p className="text-lg font-medium mb-2">{t('没有匹配的定时任务')}</p>
                                <p className="text-sm text-base-content/60">{t('请调整搜索条件或筛选器')}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-medium mb-2">{t('还没有定时任务')}</p>
                                <p className="text-sm text-base-content/60 mb-4">{t('点击"新建任务"按钮创建你的第一个定时任务')}</p>
                                <button className="btn btn-primary" onClick={() => openEdit()}>
                                    {t('创建定时任务')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredTasks.map(task => (
                        <div key={task.id} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                            <div className="card-body p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-lg">{task.name}</h3>
                                            {task.isBuiltIn && (
                                                <span className="badge badge-sm badge-ghost">内置</span>
                                            )}
                                            <span className={`badge badge-sm ${task.enabled && task.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                                                {task.enabled && task.status === 'active' ? '运行中' : '已暂停'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-base-content/70 mb-2">{task.description}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
                                            <span>⏰ {getFrequencyLabel(task)}</span>
                                            {task.lastRunAt && (
                                                <span>上次: {new Date(task.lastRunAt).toLocaleString('zh-CN')}</span>
                                            )}
                                            <span>下次: {formatNextRun(task)}</span>
                                            <span>执行 {task.runCount} 次</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 ml-4">
                                        <button
                                            className={`btn btn-sm btn-ghost btn-square tooltip`}
                                            data-tip={task.enabled && task.status === 'active' ? '暂停' : '启用'}
                                            onClick={() => handleToggle(task)}
                                        >
                                            {task.enabled && task.status === 'active' ? '⏸️' : '▶️'}
                                        </button>
                                        <button
                                            className="btn btn-sm btn-ghost btn-square tooltip"
                                            data-tip="立即执行"
                                            onClick={() => handleRunNow(task.id)}
                                        >
                                            ⚡
                                        </button>
                                        <button
                                            className="btn btn-sm btn-ghost btn-square tooltip"
                                            data-tip="编辑"
                                            onClick={() => openEdit(task)}
                                        >
                                            ✏️
                                        </button>
                                        {!task.isBuiltIn && (
                                            <>
                                                {deleteConfirmId === task.id ? (
                                                    <div className="flex gap-1">
                                                        <button className="btn btn-sm btn-error" onClick={() => handleDelete(task.id)}>确认</button>
                                                        <button className="btn btn-sm btn-ghost" onClick={() => setDeleteConfirmId(null)}>取消</button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="btn btn-sm btn-ghost btn-square tooltip"
                                                        data-tip="删除"
                                                        onClick={() => setDeleteConfirmId(task.id)}
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <ScheduledTaskEditModal
                    task={editTask}
                    onSave={(input) => {
                        if (editTask) {
                            handleUpdate(editTask.id, input);
                        } else {
                            handleCreate(input);
                        }
                    }}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditTask(null);
                    }}
                />
            )}
        </div>
    );
}
