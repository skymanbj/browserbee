import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { AgentMemory } from '../../tracking/memoryService';

export interface MemoryEditModalProps {
    /** Whether the modal is open */
    open: boolean;
    /** The memory to edit, or null if creating a new one */
    memory: AgentMemory | null;
    /** Called when the user saves changes. Both taskDescription and toolSequence are required. */
    onSave: (memory: { taskDescription: string; toolSequence: string[] }) => void;
    /** Called when the user cancels */
    onCancel: () => void;
}

/**
 * Modal dialog for editing memory task description and tool sequence.
 */
export function MemoryEditModal({ open, memory, onSave, onCancel }: MemoryEditModalProps) {
    const language = useAppSelector((state) => state.settings.language);

    const t = (key: string): string => {
        const cleanKey = key.trim();
        const translationDict: Record<string, Record<string, string>> = {
            'Edit Memory': { zh: '编辑记忆', en: 'Edit Memory' },
            'Domain': { zh: '所属域名', en: 'Domain' },
            'Domain cannot be changed here.': {
                zh: '此处无法修改所属域名。',
                en: 'Domain cannot be changed here.'
            },
            'Task Description': { zh: '任务描述', en: 'Task Description' },
            'Tool Sequence': { zh: '工具操作步骤序列', en: 'Tool Sequence' },
            'One step per line': { zh: '每行一个步骤', en: 'One step per line' },
            'Cancel': { zh: '取消', en: 'Cancel' },
            'Save': { zh: '保存', en: 'Save' }
        };
        const translated = translationDict[cleanKey]?.[language];
        return translated ?? key;
    };
    const [taskDescription, setTaskDescription] = useState('');
    const [toolSequenceText, setToolSequenceText] = useState('');
    const [error, setError] = useState('');
    const firstInputRef = useRef<HTMLInputElement>(null);

    // Populate fields when the modal opens with a memory
    useEffect(() => {
        if (open && memory) {
            setTaskDescription(memory.taskDescription || '');
            setToolSequenceText((memory.toolSequence || []).join('\n'));
            setError('');
        } else if (!open) {
            // Reset when closing
            setTaskDescription('');
            setToolSequenceText('');
            setError('');
        }
    }, [open, memory]);

    // Auto-focus the first input when modal opens
    useEffect(() => {
        if (open && firstInputRef.current) {
            firstInputRef.current.focus();
        }
    }, [open]);

    // Close on Escape key
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onCancel]);

    const handleSave = () => {
        // Validate
        if (!taskDescription.trim()) {
            setError(t('Task description is required.'));
            return;
        }

        const steps = toolSequenceText
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        if (steps.length === 0) {
            setError(t('At least one tool step is required.'));
            return;
        }

        setError('');
        onSave({
            taskDescription: taskDescription.trim(),
            toolSequence: steps,
        });
    };

    if (!open) return null;

    return (
        <div
            className="modal modal-open"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-memory-title"
        >
            <div className="modal-box max-w-xl">
                <h3 id="edit-memory-title" className="text-lg font-bold flex items-center gap-2">
                    <span aria-hidden="true">✏️</span>
                    {t('Edit Memory')}
                </h3>

                <div className="py-4 space-y-4">
                    {/* Domain (read-only) */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">{t('Domain')}</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered input-sm bg-base-200"
                            value={memory?.domain || ''}
                            disabled
                        />
                        <label className="label">
                            <span className="label-text-alt text-base-content/50">
                                {t('Domain cannot be changed here.')}
                            </span>
                        </label>
                    </div>

                    {/* Task Description */}
                    <div className="form-control">
                        <label className="label" htmlFor="memory-task-desc">
                            <span className="label-text font-medium">{t('Task Description')}</span>
                        </label>
                        <input
                            id="memory-task-desc"
                            ref={firstInputRef}
                            type="text"
                            className="input input-bordered w-full"
                            value={taskDescription}
                            onChange={(e) => {
                                setTaskDescription(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="e.g. Perform a search on Google"
                        />
                    </div>

                    {/* Tool Sequence */}
                    <div className="form-control">
                        <label className="label" htmlFor="memory-tool-seq">
                            <span className="label-text font-medium">{t('Tool Sequence')}</span>
                            <span className="label-text-alt text-base-content/50">
                                {t('One step per line')}
                            </span>
                        </label>
                        <textarea
                            id="memory-tool-seq"
                            className="textarea textarea-bordered font-mono text-sm min-h-[120px]"
                            value={toolSequenceText}
                            onChange={(e) => {
                                setToolSequenceText(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder={`browser_click | textarea[name="q"]\nbrowser_keyboard_type | [search term]\nbrowser_press_key | Enter`}
                            rows={6}
                        />
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="alert alert-error text-sm py-2" role="alert">
                            {error}
                        </div>
                    )}
                </div>

                <div className="modal-action">
                    <button
                        className="btn btn-ghost"
                        onClick={onCancel}
                        aria-label={t('Cancel')}
                    >
                        {t('Cancel')}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        aria-label={t('Save')}
                        autoFocus
                    >
                        <span aria-hidden="true">💾</span>
                        {t('Save')}
                    </button>
                </div>
            </div>

            {/* Click backdrop to cancel */}
            <div
                className="modal-backdrop"
                onClick={onCancel}
                aria-hidden="true"
            />
        </div>
    );
}