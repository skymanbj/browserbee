import React, { useCallback, useEffect, useRef, useState } from 'react';
import { logWithTimestamp } from '../../background/utils';
import { Session, SessionSummary } from '../../types/session';
import { useLanguage } from '../LanguageContext';

interface SessionStats {
    total: number;
    totalMessages: number;
    totalTokens: number;
}

async function sendMessage(action: string, payload?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action, ...payload }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

export function SessionManagement() {
    const { t } = useLanguage();
    // --- State ---
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState<SessionStats>({ total: 0, totalMessages: 0, totalTokens: 0 });
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    // Rename state
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Batch delete state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [clearAllConfirm, setClearAllConfirm] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // --- Status helper ---
    const showStatus = useCallback((type: 'success' | 'error' | 'info', text: string) => {
        setStatusMessage({ type, text });
        setTimeout(() => setStatusMessage(null), 3000);
    }, []);

    // --- Data loading ---
    const loadSessions = useCallback(async () => {
        try {
            const response = await sendMessage('sessionGetAll');
            if (response?.success && response.sessions) {
                setSessions(response.sessions);
            }
        } catch (error: any) {
            showStatus('error', `加载会话列表失败: ${error.message}`);
        }
    }, [showStatus]);

    const loadStats = useCallback(async () => {
        try {
            const response = await sendMessage('sessionGetStats');
            if (response?.success && response.stats) {
                setStats(response.stats);
            }
        } catch (error: any) {
            logWithTimestamp(`Failed to load session stats: ${error.message}`, 'error');
        }
    }, []);

    useEffect(() => {
        loadSessions();
        loadStats();
    }, [loadSessions, loadStats]);

    // --- Session detail ---
    const handleViewSession = async (id: string) => {
        try {
            const response = await sendMessage('sessionGetById', { id });
            if (response?.success && response.session) {
                setSelectedSession(response.session);
            } else {
                showStatus('error', '无法加载会话详情');
            }
        } catch (error: any) {
            showStatus('error', `加载会话详情失败: ${error.message}`);
        }
    };

    // --- Search with debounce ---
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!searchQuery.trim()) {
                loadSessions();
                return;
            }
            try {
                const response = await sendMessage('sessionSearch', { query: searchQuery.trim() });
                if (response?.success && response.sessions) {
                    setSessions(response.sessions);
                }
            } catch (error: any) {
                logWithTimestamp(`Search failed: ${error.message}`, 'error');
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, loadSessions]);

    // --- Rename ---
    const handleStartRename = (session: SessionSummary) => {
        setRenamingId(session.id);
        setRenameValue(session.name);
    };

    const handleConfirmRename = async (id: string) => {
        if (!renameValue.trim()) return;
        try {
            const response = await sendMessage('sessionRename', { id, name: renameValue.trim() });
            if (response?.success) {
                showStatus('success', '重命名成功');
                loadSessions();
                // Update selected session if currently viewing
                if (selectedSession?.id === id) {
                    setSelectedSession(prev => prev ? { ...prev, name: renameValue.trim() } : null);
                }
            } else {
                showStatus('error', '重命名失败');
            }
        } catch (error: any) {
            showStatus('error', `重命名失败: ${error.message}`);
        }
        setRenamingId(null);
    };

    const handleCancelRename = () => {
        setRenamingId(null);
        setRenameValue('');
    };

    // --- Delete (single) ---
    const handleDeleteSession = async (id: string) => {
        try {
            const response = await sendMessage('sessionDelete', { id });
            if (response?.success) {
                showStatus('success', '会话已删除');
                if (selectedSession?.id === id) setSelectedSession(null);
                loadSessions();
                loadStats();
            }
        } catch (error: any) {
            showStatus('error', `删除失败: ${error.message}`);
        }
    };

    // --- Batch delete ---
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === sessions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sessions.map(s => s.id)));
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        try {
            const response = await sendMessage('sessionDeleteMany', { ids: Array.from(selectedIds) });
            if (response?.success) {
                showStatus('success', `已删除 ${response.deleted || selectedIds.size} 个会话`);
                setSelectedIds(new Set());
                if (selectedSession && selectedIds.has(selectedSession.id)) setSelectedSession(null);
                loadSessions();
                loadStats();
            }
        } catch (error: any) {
            showStatus('error', `批量删除失败: ${error.message}`);
        }
        setShowDeleteConfirm(false);
    };

    // --- Clear all ---
    const handleClearAll = async () => {
        try {
            const response = await sendMessage('sessionClearAll');
            if (response?.success) {
                showStatus('success', '已清除所有会话');
                setSelectedSession(null);
                setSelectedIds(new Set());
                loadSessions();
                loadStats();
            }
        } catch (error: any) {
            showStatus('error', `清除失败: ${error.message}`);
        }
        setClearAllConfirm(false);
    };

    // --- Export ---
    const handleExport = async () => {
        try {
            const ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
            const response = await sendMessage('sessionExport', { sessionIds: ids });
            if (response?.success && response.json) {
                const blob = new Blob([response.json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const date = new Date().toISOString().split('T')[0];
                const a = document.createElement('a');
                a.href = url;
                a.download = `browserbee-sessions-${date}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showStatus('success', '会话已导出');
            }
        } catch (error: any) {
            showStatus('error', `导出失败: ${error.message}`);
        }
    };

    // --- Import ---
    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target?.result as string;
                try {
                    const response = await sendMessage('sessionImport', { json: content });
                    if (response?.success) {
                        showStatus('success', `导入成功: ${response.imported || 0} 个导入, ${response.skipped || 0} 个跳过`);
                        loadSessions();
                        loadStats();
                    } else {
                        showStatus('error', '导入失败');
                    }
                } catch (importError: any) {
                    showStatus('error', `导入失败: ${importError.message}`);
                }
            };
            reader.readAsText(file);
        } catch (error: any) {
            showStatus('error', `读取文件失败: ${error.message}`);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- Format helpers ---
    const formatDate = (ts: number) => new Date(ts).toLocaleString('zh-CN');
    const formatDateShort = (ts: number) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return '刚刚';
        if (diffMins < 60) return `${diffMins}分钟前`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}小时前`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}天前`;
        return d.toLocaleDateString('zh-CN');
    };
    const truncate = (str: string, len: number) => str.length > len ? str.substring(0, len) + '...' : str;

    // --- Render session detail panel ---
    const renderSessionDetail = () => {
        if (!selectedSession) return null;

        return (
            <div className="card bg-base-100 shadow-md">
                <div className="card-body">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="card-title text-lg">{selectedSession.name}</h3>
                        <button className="btn btn-sm btn-ghost" onClick={() => setSelectedSession(null)}>
                            ✕
                        </button>
                    </div>

                    <div className="text-sm text-base-content/70 mb-4 space-y-1">
                        <p>标签页: {selectedSession.tabTitle}</p>
                        {selectedSession.url && <p className="truncate">URL: {selectedSession.url}</p>}
                        <p>提供商: {selectedSession.provider}{selectedSession.modelId ? ` / ${selectedSession.modelId}` : ''}</p>
                        <p>消息数: {selectedSession.messageCount}</p>
                        <p>创建: {formatDate(selectedSession.createdAt)}</p>
                        <p>更新: {formatDate(selectedSession.updatedAt)}</p>
                    </div>

                    {/* Messages */}
                    <div className="divider text-sm">{t('对话消息')}</div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {selectedSession.messages.length === 0 && (
                            <p className="text-base-content/50 text-center py-4">{t('暂无消息')}</p>
                        )}
                        {selectedSession.messages.map((msg, idx) => (
                            <div key={idx} className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                                <div className="chat-header text-xs mb-1">
                                    {msg.role === 'user' ? t('👤 用户') : t('🤖 助手')}
                                    <time className="ml-2 opacity-50">{new Date(msg.timestamp).toLocaleTimeString('zh-CN')}</time>
                                    {msg.tokenCount !== undefined && (
                                        <span className="ml-2 opacity-50">{msg.tokenCount} tokens</span>
                                    )}
                                </div>
                                <div className={`chat-bubble text-sm ${msg.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}>
                                    <pre className="whitespace-pre-wrap font-sans text-sm m-0">{truncate(msg.content, 500)}</pre>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // --- Main render ---
    return (
        <div className="flex flex-col gap-4">
            {/* Status message */}
            {statusMessage && (
                <div className={`alert ${statusMessage.type === 'success' ? 'alert-success' : statusMessage.type === 'error' ? 'alert-error' : 'alert-info'} shadow-md`}>
                    <span>{statusMessage.text}</span>
                </div>
            )}

            {/* Stats bar */}
            <div className="stats shadow">
                <div className="stat">
                    <div className="stat-title">{t('会话总数')}</div>
                    <div className="stat-value text-primary">{stats.total}</div>
                </div>
                <div className="stat">
                    <div className="stat-title">{t('消息总数')}</div>
                    <div className="stat-value text-secondary">{stats.totalMessages}</div>
                </div>
                <div className="stat">
                    <div className="stat-title">{t('累计 Token')}</div>
                    <div className="stat-value text-accent">{stats.totalTokens.toLocaleString()}</div>
                </div>
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="form-control flex-1 min-w-[200px]">
                    <div className="input-group">
                        <input
                             ref={searchInputRef}
                             type="text"
                             placeholder={t('搜索会话名称、标签页、URL、消息内容...')}
                             className="input input-bordered w-full"
                             value={searchQuery}
                             onChange={e => setSearchQuery(e.target.value)}
                         />
                        {searchQuery && (
                            <button className="btn btn-square btn-ghost" onClick={() => setSearchQuery('')}>
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Export */}
                <button
                    className="btn btn-outline btn-sm"
                    onClick={handleExport}
                    disabled={sessions.length === 0}
                    title="导出选中的会话，如未选中则导出全部"
                >
                    {t('导出')}
                </button>

                {/* Import */}
                <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()}>
                    {t('导入')}
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImport}
                    accept=".json"
                    className="hidden"
                />

                {/* Batch delete */}
                {selectedIds.size > 0 && (
                    <>
                        <button className="btn btn-error btn-sm" onClick={() => setShowDeleteConfirm(true)}>
                            {t('删除选中')} ({selectedIds.size})
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>
                            {t('取消选择')}
                        </button>
                    </>
                )}

                {/* Clear all */}
                <button
                    className="btn btn-ghost btn-sm text-error"
                    onClick={() => setClearAllConfirm(true)}
                    disabled={sessions.length === 0}
                >
                    {t('清除全部')}
                </button>
            </div>

            {/* Main content: list + detail */}
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Session list */}
                <div className="flex-1">
                    <div className="card bg-base-100 shadow-md">
                        <div className="card-body p-0">
                            {/* Select all checkbox header */}
                            {sessions.length > 0 && (
                                <div className="flex items-center gap-2 px-4 py-2 border-b border-base-200 bg-base-200/50 rounded-t-box">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-xs"
                                        checked={selectedIds.size === sessions.length && sessions.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                    <span className="text-xs text-base-content/60">
                                        {selectedIds.size > 0
                                            ? `${t('已选')} ${selectedIds.size} / ${sessions.length}`
                                            : `${sessions.length} 个会话`}
                                    </span>
                                </div>
                            )}

                            {/* List */}
                            <div className="divide-y divide-base-200 max-h-[500px] overflow-y-auto">
                                {sessions.length === 0 && (
                                    <div className="text-center py-8 text-base-content/50">
                                        {searchQuery ? t('未找到匹配的会话') : t('暂无会话记录')}
                                    </div>
                                )}
                                {sessions.map(session => (
                                    <div
                                        key={session.id}
                                        className={`flex items-center gap-2 px-4 py-3 hover:bg-base-200 cursor-pointer transition-colors ${selectedSession?.id === session.id ? 'bg-base-200' : ''
                                            }`}
                                    >
                                        {/* Checkbox */}
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-xs"
                                            checked={selectedIds.has(session.id)}
                                            onChange={() => toggleSelect(session.id)}
                                            onClick={e => e.stopPropagation()}
                                        />

                                        {/* Content */}
                                        <div className="flex-1 min-w-0" onClick={() => handleViewSession(session.id)}>
                                            {renamingId === session.id ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        className="input input-bordered input-xs flex-1"
                                                        value={renameValue}
                                                        onChange={e => setRenameValue(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleConfirmRename(session.id);
                                                            if (e.key === 'Escape') handleCancelRename();
                                                        }}
                                                        autoFocus
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                    <button className="btn btn-xs btn-primary" onClick={e => { e.stopPropagation(); handleConfirmRename(session.id); }}>
                                                        确认
                                                    </button>
                                                    <button className="btn btn-xs btn-ghost" onClick={e => { e.stopPropagation(); handleCancelRename(); }}>
                                                        取消
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="font-medium text-sm truncate">{session.name}</div>
                                                    <div className="text-xs text-base-content/50 flex items-center gap-2 mt-0.5">
                                                        <span className="truncate max-w-[200px]">{session.tabTitle}</span>
                                                        <span>·</span>
                                                        <span>{session.messageCount} 条消息</span>
                                                        <span>·</span>
                                                        <span>{formatDateShort(session.updatedAt)}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {renamingId !== session.id && (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    className="btn btn-xs btn-ghost"
                                                    title="重命名"
                                                    onClick={e => { e.stopPropagation(); handleStartRename(session); }}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn btn-xs btn-ghost text-error"
                                                    title="删除"
                                                    onClick={e => { e.stopPropagation(); handleDeleteSession(session.id); }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detail panel */}
                {selectedSession && (
                    <div className="w-full lg:w-[420px] shrink-0">
                        {renderSessionDetail()}
                    </div>
                )}
            </div>

            {/* Delete confirm modal */}
            {showDeleteConfirm && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">确认删除</h3>
                        <p className="py-4">确定要删除选中的 {selectedIds.size} 个会话吗？此操作不可撤销。</p>
                        <div className="modal-action">
                            <button className="btn btn-error" onClick={handleBatchDelete}>确认删除</button>
                            <button className="btn" onClick={() => setShowDeleteConfirm(false)}>取消</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear all confirm modal */}
            {clearAllConfirm && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">确认清除全部</h3>
                        <p className="py-4">确定要清除所有 {stats.total} 个会话记录吗？此操作不可撤销。</p>
                        <div className="modal-action">
                            <button className="btn btn-error" onClick={handleClearAll}>确认清除</button>
                            <button className="btn" onClick={() => setClearAllConfirm(false)}>取消</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}