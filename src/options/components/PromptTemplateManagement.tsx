import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PromptTemplateService } from '../../tracking/promptTemplateService';
import { PromptTemplate } from '../../types/promptTemplate';
import { PromptTemplateEditModal } from './PromptTemplateEditModal';
import { useLanguage } from '../LanguageContext';

/**
 * Full management UI for prompt templates – list, search, filter by category,
 * create, edit, delete, export, and import.
 */
export function PromptTemplateManagement() {
    const { t } = useLanguage();
    // ── Data state ──
    const [templates, setTemplates] = useState<PromptTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── UI state ──
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [creatingNew, setCreatingNew] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const service = useMemo(() => PromptTemplateService.getInstance(), []);

    // ── Derived data ──
    const categories = useMemo(() => {
        const set = new Set<string>();
        for (const t of templates) {
            if (t.category) set.add(t.category);
        }
        return Array.from(set).sort();
    }, [templates]);

    const filteredTemplates = useMemo(() => {
        let result = templates;
        if (selectedCategory) {
            result = result.filter((t) => t.category === selectedCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(
                (t) =>
                    t.name.toLowerCase().includes(q) ||
                    t.prompt.toLowerCase().includes(q) ||
                    (t.category || '').toLowerCase().includes(q)
            );
        }
        return result.sort((a, b) => {
            // Built-in first, then by updatedAt descending
            if (a.isBuiltIn && !b.isBuiltIn) return -1;
            if (!a.isBuiltIn && b.isBuiltIn) return 1;
            return b.updatedAt - a.updatedAt;
        });
    }, [templates, searchQuery, selectedCategory]);

    // ── Load ──
    const loadTemplates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const all = await service.getAll();
            setTemplates(all);
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载模板失败');
        } finally {
            setLoading(false);
        }
    }, [service]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    // ── Create / Edit ──
    const handleNewTemplate = () => {
        setEditingTemplate(null);
        setCreatingNew(true);
        setShowEditModal(true);
    };

    const handleEdit = (t: PromptTemplate) => {
        setEditingTemplate(t);
        setCreatingNew(false);
        setShowEditModal(true);
    };

    const handleSave = async (data: { name: string; prompt: string; category?: string }) => {
        try {
            if (creatingNew) {
                await service.create(data);
                setStatusMessage({ text: `模板「${data.name}」已创建`, type: 'success' });
            } else if (editingTemplate) {
                await service.save({ ...editingTemplate, ...data });
                setStatusMessage({ text: `模板「${data.name}」已更新`, type: 'success' });
            }
            setShowEditModal(false);
            setEditingTemplate(null);
            setCreatingNew(false);
            await loadTemplates();
        } catch (err) {
            setStatusMessage({ text: `保存失败: ${err instanceof Error ? err.message : '未知错误'}`, type: 'error' });
        }
        setTimeout(() => setStatusMessage(null), 3000);
    };

    // ── Delete ──
    const handleDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            const success = await service.delete(deleteConfirmId);
            if (success) {
                setStatusMessage({ text: '模板已删除', type: 'success' });
                await loadTemplates();
            } else {
                setStatusMessage({ text: '内置模板无法删除', type: 'error' });
            }
        } catch (err) {
            setStatusMessage({ text: `删除失败: ${err instanceof Error ? err.message : '未知错误'}`, type: 'error' });
        }
        setDeleteConfirmId(null);
        setTimeout(() => setStatusMessage(null), 3000);
    };

    // ── Export ──
    const handleExport = async () => {
        try {
            setStatusMessage({ text: '导出中...', type: 'success' });
            const json = await service.exportToJson();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const date = new Date().toISOString().split('T')[0];
            const a = document.createElement('a');
            a.href = url;
            a.download = `browserbee-prompt-templates-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setStatusMessage({ text: '导出成功', type: 'success' });
        } catch (err) {
            setStatusMessage({ text: `导出失败: ${err instanceof Error ? err.message : '未知错误'}`, type: 'error' });
        }
        setTimeout(() => setStatusMessage(null), 3000);
    };

    // ── Import ──
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setStatusMessage({ text: '导入中...', type: 'success' });
            const content = await file.text();
            const count = await service.importFromJson(content);
            setStatusMessage({ text: `成功导入 ${count} 个模板`, type: 'success' });
            await loadTemplates();
        } catch (err) {
            setStatusMessage({ text: `导入失败: ${err instanceof Error ? err.message : '未知错误'}`, type: 'error' });
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setStatusMessage(null), 3000);
    };

    // ── Format date ──
    const formatDate = (ts: number) => {
        if (!ts) return '-';
        return new Date(ts).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    };

    // ── Render ──
    return (
        <div className="space-y-4">
            {/* Header card */}
            <div className="card bg-base-100 shadow-md">
                <div className="card-body">
                    <h2 className="card-title text-xl flex items-center gap-2">
                        <span aria-hidden="true">📋</span>
                        {t('Prompt Templates')}
                    </h2>
                    <p className="text-sm text-base-content/70">
                        {t('Manage reusable templates for prompts. BrowserBee allows saving structures you use frequently to launch tasks quickly.')}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                        <div className="stat px-2 py-1 min-w-0">
                            <div className="stat-title text-xs">{t('模板总数')}</div>
                            <div className="stat-value text-xl">{templates.length}</div>
                        </div>
                        <div className="stat px-2 py-1 min-w-0">
                            <div className="stat-title text-xs">{t('分类数')}</div>
                            <div className="stat-value text-xl">{categories.length}</div>
                        </div>
                        <div className="stat px-2 py-1 min-w-0">
                            <div className="stat-title text-xs">{t('内置模板')}</div>
                            <div className="stat-value text-xl">{templates.filter(t => t.isBuiltIn).length}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search / Filter / Action bar */}
            <div className="card bg-base-100 shadow-md">
                <div className="card-body py-3">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="form-control flex-1 min-w-[180px]">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-sm">🔍</span>
                                <input
                                    type="text"
                                    className="input input-bordered input-sm w-full pl-8"
                                    placeholder={t('搜索模板名称、内容或分类...')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    aria-label="搜索模板"
                                />
                            </div>
                        </div>

                        {/* Category filter chips */}
                        <div className="join" role="group" aria-label="分类筛选">
                            <button
                                className={`join-item btn btn-sm ${!selectedCategory ? 'btn-active' : ''}`}
                                onClick={() => setSelectedCategory(null)}
                            >
                                {t('全部')}
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    className={`join-item btn btn-sm ${selectedCategory === cat ? 'btn-active' : ''}`}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        <button className="btn btn-primary btn-sm" onClick={handleNewTemplate}>
                            <span aria-hidden="true">➕</span>
                            {t('新建模板')}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={handleExport} disabled={templates.length === 0}>
                            📤 {t('导出')}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}>
                            📥 {t('导入')}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                        <button className="btn btn-ghost btn-sm ml-auto" onClick={loadTemplates} disabled={loading}>
                            🔄 {t('刷新')}
                        </button>
                    </div>

                    {/* Status messages */}
                    {statusMessage && (
                        <div className={`alert text-sm py-1.5 mt-2 ${statusMessage.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                            {statusMessage.text}
                        </div>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="alert alert-error text-sm" role="alert">
                    <span>❌ {error}</span>
                    <button className="btn btn-sm btn-ghost" onClick={() => setError(null)}>关闭</button>
                </div>
            )}

            {/* Template list */}
            <div className="card bg-base-100 shadow-md">
                <div className="card-body p-4">
                    {loading ? (
                        <div className="space-y-3">
                            <div className="skeleton h-8 w-full" />
                            <div className="skeleton h-6 w-3/4" />
                            <div className="skeleton h-6 w-1/2" />
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-8 text-base-content/50">
                            <div className="text-3xl mb-3">📋</div>
                            <p className="font-medium text-lg mb-1">还没有提示词模板</p>
                            <p className="text-sm">
                                点击「新建模板」创建你的第一个模板，或从 JSON 文件导入。
                            </p>
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="text-center py-8 text-base-content/50">
                            <div className="text-3xl mb-3">🔍</div>
                            <p className="font-medium text-lg mb-1">没有匹配的模板</p>
                            <p className="text-sm">尝试其他搜索词或分类筛选。</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredTemplates.map((t) => (
                                <div
                                    key={t.id}
                                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${t.isBuiltIn ? 'bg-base-200/40' : 'hover:bg-base-200/60'
                                        }`}
                                >
                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm">{t.name}</span>
                                            {t.category && (
                                                <span className="badge badge-sm badge-outline">{t.category}</span>
                                            )}
                                            {t.isBuiltIn && (
                                                <span className="badge badge-sm badge-ghost">内置</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-base-content/60 mt-1 font-mono line-clamp-2 whitespace-pre-wrap">
                                            {t.prompt}
                                        </p>
                                        <p className="text-xs text-base-content/40 mt-1">
                                            更新于 {formatDate(t.updatedAt)}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-1 flex-shrink-0">
                                        <button
                                            className="btn btn-ghost btn-xs"
                                            onClick={() => handleEdit(t)}
                                            aria-label="编辑模板"
                                            title="编辑"
                                        >
                                            ✏️
                                        </button>
                                        {!t.isBuiltIn && (
                                            <button
                                                className="btn btn-ghost btn-xs text-error"
                                                onClick={() => setDeleteConfirmId(t.id)}
                                                aria-label="删除模板"
                                                title="删除"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit / Create Modal */}
            <PromptTemplateEditModal
                open={showEditModal}
                template={creatingNew ? null : editingTemplate}
                onSave={handleSave}
                onCancel={() => {
                    setShowEditModal(false);
                    setEditingTemplate(null);
                    setCreatingNew(false);
                }}
            />

            {/* Delete confirmation dialog */}
            {deleteConfirmId && (
                <div className="modal modal-open" role="dialog" aria-modal="true">
                    <div className="modal-box max-w-sm">
                        <h3 className="text-lg font-bold">确认删除</h3>
                        <p className="py-4 text-sm">确定要删除这个提示词模板吗？此操作不可撤销。</p>
                        <div className="modal-action">
                            <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirmId(null)}>
                                取消
                            </button>
                            <button className="btn btn-error btn-sm" onClick={handleDelete}>
                                🗑️ 删除
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={() => setDeleteConfirmId(null)} />
                </div>
            )}
        </div>
    );
}