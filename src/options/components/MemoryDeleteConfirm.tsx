import { useEffect } from 'react';
import { useLanguage } from '../LanguageContext';

export interface MemoryDeleteConfirmProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Title displayed in the dialog header */
    title: string;
    /** Description text shown above the summary list */
    description?: string;
    /** Array of memory summaries to display (domain + task) */
    items: Array<{ domain: string; taskDescription: string }>;
    /** Confirm button label */
    confirmLabel?: string;
    /** Cancel button label */
    cancelLabel?: string;
    /** Called when the user confirms deletion */
    onConfirm: () => void;
    /** Called when the user cancels */
    onCancel: () => void;
}

/**
 * A reusable confirmation dialog for deleting memories.
 * Supports both single and batch deletion with a summary list.
 */
export function MemoryDeleteConfirm({
    open,
    title,
    description,
    items,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
}: MemoryDeleteConfirmProps) {
    const { t } = useLanguage();
    
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

    if (!open) return null;

    const finalConfirmLabel = confirmLabel || t('Delete');
    const finalCancelLabel = cancelLabel || t('Cancel');

    // Limit the number of displayed items to avoid an overly tall dialog
    const maxDisplay = 5;
    const displayedItems = items.slice(0, maxDisplay);
    const remainingCount = items.length - displayedItems.length;

    return (
        <div
            className="modal modal-open"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
        >
            <div className="modal-box max-w-lg">
                <h3 id="delete-confirm-title" className="text-lg font-bold text-error flex items-center gap-2">
                    <span aria-hidden="true">⚠️</span>
                    {title}
                </h3>

                {description && (
                    <p className="py-2 text-sm text-base-content/70">{description}</p>
                )}

                {items.length > 0 && (
                    <div className="py-2">
                        <div className="text-xs font-semibold uppercase text-base-content/50 mb-2">
                            {t('Memories to be deleted')} ({items.length}):
                        </div>
                        <ul className="max-h-48 overflow-y-auto space-y-1">
                            {displayedItems.map((item, idx) => (
                                <li
                                    key={idx}
                                    className="text-sm bg-base-200 rounded px-2 py-1 flex items-start gap-2"
                                >
                                    <span className="badge badge-sm badge-ghost shrink-0">
                                        {item.domain}
                                    </span>
                                    <span className="truncate">{item.taskDescription}</span>
                                </li>
                             ))}
                             {remainingCount > 0 && (
                                <li className="text-sm text-base-content/50 italic px-2">
                                    {t('...and {count} more').replace('{count}', String(remainingCount))}
                                </li>
                             )}
                        </ul>
                    </div>
                )}

                <div className="text-sm text-warning bg-warning/10 rounded px-3 py-2 mt-2">
                    {t('This action cannot be undone.')}
                </div>

                <div className="modal-action">
                    <button
                        className="btn btn-ghost"
                        onClick={onCancel}
                        aria-label={finalCancelLabel}
                    >
                        {finalCancelLabel}
                    </button>
                    <button
                        className="btn btn-error"
                        onClick={onConfirm}
                        aria-label={finalConfirmLabel}
                        autoFocus
                    >
                        <span aria-hidden="true">🗑️</span>
                        {finalConfirmLabel}
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
