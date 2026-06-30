import { useEffect, useRef, useState } from 'react';
import { PromptTemplate } from '../../types/promptTemplate';

export interface PromptTemplateEditModalProps {
    /** Whether the modal is open */
    open: boolean;
    /** The template to edit, or null when creating a new one */
    template: PromptTemplate | null;
    /** Called when the user saves. Content is validated before calling. */
    onSave: (data: { name: string; prompt: string; category?: string }) => void;
    /** Called when the user cancels or dismisses */
    onCancel: () => void;
}

/**
 * Modal dialog for creating or editing a prompt template.
 */
export function PromptTemplateEditModal({
    open,
    template,
    onSave,
    onCancel,
}: PromptTemplateEditModalProps) {
    const [name, setName] = useState('');
    const [prompt, setPrompt] = useState('');
    const [category, setCategory] = useState('');
    const [error, setError] = useState('');
    const firstInputRef = useRef<HTMLInputElement>(null);

    // Populate fields when modal opens
    useEffect(() => {
        if (open) {
            setName(template?.name || '');
            setPrompt(template?.prompt || '');
            setCategory(template?.category || '');
            setError('');
        }
    }, [open, template]);

    // Auto-focus when modal opens
    useEffect(() => {
        if (open && firstInputRef.current) {
            firstInputRef.current.focus();
        }
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onCancel]);

    const handleSave = () => {
        if (!name.trim()) {
            setError('模板名称不能为空');
            return;
        }
        if (!prompt.trim()) {
            setError('模板内容不能为空');
            return;
        }
        setError('');
        onSave({ name: name.trim(), prompt: prompt.trim(), category: category.trim() || undefined });
    };

    if (!open) return null;

    return (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="pt-edit-title">
            <div className="modal-box max-w-2xl">
                <h3 id="pt-edit-title" className="text-lg font-bold flex items-center gap-2">
                    <span aria-hidden="true">{template ? '✏️' : '🆕'}</span>
                    {template ? '编辑提示词模板' : '新建提示词模板'}
                </h3>

                <div className="py-4 space-y-4">
                    {/* Template name */}
                    <div className="form-control">
                        <label className="label" htmlFor="pt-name">
                            <span className="label-text font-medium">模板名称</span>
                        </label>
                        <input
                            id="pt-name"
                            ref={firstInputRef}
                            type="text"
                            className="input input-bordered w-full"
                            value={name}
                            onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
                            placeholder="如: 翻译成日文"
                        />
                    </div>

                    {/* Category */}
                    <div className="form-control">
                        <label className="label" htmlFor="pt-category">
                            <span className="label-text font-medium">分类</span>
                            <span className="label-text-alt text-base-content/50">可选</span>
                        </label>
                        <input
                            id="pt-category"
                            type="text"
                            className="input input-bordered input-sm w-full max-w-xs"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="如: 翻译、编程、写作"
                        />
                    </div>

                    {/* Prompt content */}
                    <div className="form-control">
                        <label className="label" htmlFor="pt-prompt">
                            <span className="label-text font-medium">模板内容</span>
                            <span className="label-text-alt text-base-content/50">
                                使用 <code className="bg-base-200 px-1 rounded">{'{{变量名}}'}</code> 定义变量
                            </span>
                        </label>
                        <textarea
                            id="pt-prompt"
                            className="textarea textarea-bordered font-mono text-sm min-h-[160px]"
                            value={prompt}
                            onChange={(e) => { setPrompt(e.target.value); if (error) setError(''); }}
                            placeholder="例如: 请将以下内容翻译成{{targetLanguage}}：\n\n{{text}}"
                            rows={8}
                        />
                    </div>

                    {/* Variable hint */}
                    {extractVarNames(prompt).length > 0 && (
                        <div className="alert alert-info text-sm py-2">
                            <span>检测到变量：</span>
                            <code className="font-bold">
                                {extractVarNames(prompt).map(v => `{{${v}}}`).join(', ')}
                            </code>
                            <span className="text-base-content/60 ml-2">
                                — 使用时将被询问替换值
                            </span>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="alert alert-error text-sm py-2" role="alert">
                            {error}
                        </div>
                    )}
                </div>

                <div className="modal-action">
                    <button className="btn btn-ghost" onClick={onCancel} aria-label="取消">
                        取消
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} aria-label="保存模板">
                        <span aria-hidden="true">💾</span>
                        保存
                    </button>
                </div>
            </div>

            {/* Backdrop click to cancel */}
            <div className="modal-backdrop" onClick={onCancel} aria-hidden="true" />
        </div>
    );
}

/** Extract variable names from template text for preview */
function extractVarNames(prompt: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const names: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(prompt)) !== null) {
        if (!names.includes(m[1])) names.push(m[1]);
    }
    return names;
}