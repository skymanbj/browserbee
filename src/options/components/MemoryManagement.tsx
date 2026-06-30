import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeDomain } from '../../tracking/domainUtils';
import { AgentMemory, MemoryService } from '../../tracking/memoryService';
import { MemoryDeleteConfirm } from './MemoryDeleteConfirm';
import { MemoryEditModal } from './MemoryEditModal';
import { useLanguage } from '../LanguageContext';

/** Possible sources for a memory badge */
type MemorySource = 'pre-built' | 'auto-reflection' | 'user-saved';

/** Filter mode for the memory list */
type FilterMode = 'all' | 'pre-built' | 'user';

/**
 * Determine the source of a memory based on how it looks
 * Pre-built memories come from defaultMemories.json and have specific date patterns
 */
function getMemorySource(memory: AgentMemory): MemorySource {
  // Auto-reflection memories are created by the reflection process, typically with specific domain info
  // User-saved memories are created via save_memory tool explicitly
  // Pre-built memories are from defaultMemories.json
  // We use heuristics based on the data available
  if (!memory.id) return 'user-saved';

  // Memories with IDs >= 100 are likely defaults (large gap from auto-increment)
  // But this is unreliable. Check the createdAt timestamp instead.
  // Pre-built have timestamps around Apr-May 2025
  if (memory.createdAt < 1747000000000) {
    return 'pre-built';
  }

  return 'user-saved';
}

/** Format a timestamp to a readable date string */
function formatDate(timestamp: number): string {
  if (!timestamp) return 'Unknown';
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid date';
  }
}

export function MemoryManagement() {
  const { t } = useLanguage();
  // ── Data state ────────────────────────────────────────────
  const [allMemories, setAllMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // ── Modal state ───────────────────────────────────────────
  const [editingMemory, setEditingMemory] = useState<AgentMemory | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'single' | 'batch' | 'all';
    ids: number[];
    items: Array<{ domain: string; taskDescription: string }>;
  } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ── Status messages ───────────────────────────────────────
  const [exportStatus, setExportStatus] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived data ──────────────────────────────────────────
  const domainCount = useMemo(() => {
    const domains = new Set(allMemories.map(m => m.domain));
    return domains.size;
  }, [allMemories]);

  // Apply search filter and filter mode
  const filteredMemories = useMemo(() => {
    let result = allMemories;

    // Filter by source mode
    if (filterMode === 'pre-built') {
      result = result.filter(m => getMemorySource(m) === 'pre-built');
    } else if (filterMode === 'user') {
      result = result.filter(m => getMemorySource(m) !== 'pre-built');
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        m =>
          m.domain.toLowerCase().includes(query) ||
          m.taskDescription.toLowerCase().includes(query)
      );
    }

    // Sort by newest first
    return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [allMemories, searchQuery, filterMode]);

  // Group filtered memories by domain for display
  const groupedMemories = useMemo(() => {
    const groups: Record<string, AgentMemory[]> = {};
    for (const memory of filteredMemories) {
      if (!groups[memory.domain]) {
        groups[memory.domain] = [];
      }
      groups[memory.domain].push(memory);
    }
    return groups;
  }, [filteredMemories]);

  // All selected are in the currently visible set
  const allVisibleSelected = useMemo(() => {
    if (filteredMemories.length === 0) return false;
    return filteredMemories.every(m => m.id != null && selectedIds.has(m.id));
  }, [filteredMemories, selectedIds]);

  // ── Data loading ──────────────────────────────────────────
  const loadMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const memoryService = MemoryService.getInstance();
      await memoryService.init();
      const memories = await memoryService.getAllMemories();
      setAllMemories(memories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memories');
      console.error('Error loading memories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // ── Selection helpers ─────────────────────────────────────
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      // Deselect all visible
      const visibleIds = filteredMemories.map(m => m.id).filter((id): id is number => id != null);
      setSelectedIds(prev => {
        const next = new Set(prev);
        for (const id of visibleIds) {
          next.delete(id);
        }
        return next;
      });
    } else {
      // Select all visible
      const visibleIds = filteredMemories.map(m => m.id).filter((id): id is number => id != null);
      setSelectedIds(prev => {
        const next = new Set(prev);
        for (const id of visibleIds) {
          next.add(id);
        }
        return next;
      });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Delete operations ─────────────────────────────────────
  const handleSingleDelete = (memory: AgentMemory) => {
    setDeleteTarget({
      type: 'single',
      ids: memory.id != null ? [memory.id] : [],
      items: [{ domain: memory.domain, taskDescription: memory.taskDescription }],
    });
  };

  const handleBatchDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const items = allMemories
      .filter(m => m.id != null && selectedIds.has(m.id))
      .map(m => ({ domain: m.domain, taskDescription: m.taskDescription }));
    setDeleteTarget({ type: 'batch', ids, items });
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const memoryService = MemoryService.getInstance();
      if (deleteTarget.ids.length > 0) {
        await memoryService.deleteMemories(deleteTarget.ids);
      }
      setDeleteTarget(null);
      setSelectedIds(new Set());
      await loadMemories();
    } catch (err) {
      console.error('Error deleting memories:', err);
      setDeleteTarget(null);
      setError(err instanceof Error ? err.message : 'Failed to delete memories');
    }
  };

  const confirmClearAll = async () => {
    try {
      const memoryService = MemoryService.getInstance();
      await memoryService.clearMemories();
      setShowClearConfirm(false);
      setSelectedIds(new Set());
      await loadMemories();
    } catch (err) {
      console.error('Error clearing memories:', err);
      setShowClearConfirm(false);
      setError(err instanceof Error ? err.message : 'Failed to clear memories');
    }
  };

  // ── Edit operations ───────────────────────────────────────
  const handleEdit = (memory: AgentMemory) => {
    setEditingMemory(memory);
    setShowEditModal(true);
  };

  const confirmEdit = async (updated: { taskDescription: string; toolSequence: string[] }) => {
    if (!editingMemory || editingMemory.id == null) return;
    try {
      const memoryService = MemoryService.getInstance();
      await memoryService.updateMemory(editingMemory.id, {
        taskDescription: updated.taskDescription,
        toolSequence: updated.toolSequence,
        createdAt: Date.now(),
      });
      setShowEditModal(false);
      setEditingMemory(null);
      await loadMemories();
    } catch (err) {
      console.error('Error updating memory:', err);
      setError(err instanceof Error ? err.message : 'Failed to update memory');
    }
  };

  // ── Export ────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setExportStatus('Exporting...');
      const memoryService = MemoryService.getInstance();
      const memories = await memoryService.getAllMemories();

      const jsonData = JSON.stringify(memories, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const date = new Date().toISOString().split('T')[0];
      const filename = `browserbee-memories-${date}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus(`Exported ${memories.length} memories.`);
      setTimeout(() => setExportStatus(''), 3000);
    } catch (err) {
      setExportStatus(`Error: ${err instanceof Error ? err.message : 'Export failed'}`);
    }
  };

  // ── Import ────────────────────────────────────────────────
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus('Importing...');

    try {
      const content = await file.text();
      const memories: any[] = JSON.parse(content);

      if (!Array.isArray(memories)) {
        throw new Error('Invalid format: Expected an array of memories');
      }

      const memoryService = MemoryService.getInstance();
      let importedCount = 0;

      for (const memory of memories) {
        if (!memory.domain || !memory.taskDescription || !memory.toolSequence) {
          console.warn('Skipping invalid memory:', memory);
          continue;
        }
        if (!memory.createdAt) {
          memory.createdAt = Date.now();
        }
        memory.domain = normalizeDomain(memory.domain);
        delete memory.id; // Let IndexedDB assign new IDs

        await memoryService.storeMemory(memory);
        importedCount++;
      }

      await loadMemories();
      setImportStatus(`Imported ${importedCount} memories.`);
      setTimeout(() => setImportStatus(''), 3000);
    } catch (err) {
      setImportStatus(`Error: ${err instanceof Error ? err.message : 'Import failed'}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ── Render helpers ────────────────────────────────────────
  const renderMemoryRow = (memory: AgentMemory) => {
    const id = memory.id;
    if (id == null) return null;
    const isExpanded = expandedIds.has(id);
    const isSelected = selectedIds.has(id);
    const source = getMemorySource(memory);
    const stepsCount = memory.toolSequence?.length || 0;

    return (
      <React.Fragment key={id}>
        {/* Main row */}
        <tr className={`hover ${isSelected ? 'bg-primary/5' : ''}`}>
          <td className="w-10">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={isSelected}
              onChange={() => toggleSelect(id)}
              aria-label={`Select memory: ${memory.taskDescription}`}
            />
          </td>
          <td>
            <span className="badge badge-outline badge-sm font-mono">
              {memory.domain}
            </span>
          </td>
          <td className="max-w-xs">
            <button
              className="text-left w-full flex items-center gap-2"
              onClick={() => toggleExpand(id)}
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              <span className="text-xs text-base-content/40 transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                ▶
              </span>
              <span className="truncate">{memory.taskDescription}</span>
            </button>
          </td>
          <td className="text-center text-sm text-base-content/60">
            {stepsCount} step{stepsCount !== 1 ? 's' : ''}
          </td>
          <td>
            <span className={`badge badge-sm ${source === 'pre-built' ? 'badge-ghost' : source === 'auto-reflection' ? 'badge-info' : 'badge-success'}`}>
              {source === 'pre-built' ? 'Pre-built' : source === 'auto-reflection' ? 'Auto' : 'User'}
            </span>
          </td>
          <td className="text-xs text-base-content/50 whitespace-nowrap">
            {formatDate(memory.createdAt)}
          </td>
          <td className="w-24">
            <div className="flex gap-1">
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => handleEdit(memory)}
                aria-label="Edit memory"
                title="Edit"
              >
                ✏️
              </button>
              <button
                className="btn btn-ghost btn-xs text-error"
                onClick={() => handleSingleDelete(memory)}
                aria-label="Delete memory"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </td>
        </tr>

        {/* Expanded detail row */}
        {isExpanded && (
          <tr className="bg-base-200/50">
            <td colSpan={7} className="p-0">
              <div className="px-10 py-3 space-y-1">
                <div className="text-xs font-semibold uppercase text-base-content/40 mb-1">
                  Tool Sequence:
                </div>
                {memory.toolSequence && memory.toolSequence.length > 0 ? (
                  <ol className="list-decimal list-inside space-y-0.5">
                    {memory.toolSequence.map((step, idx) => (
                      <li key={idx} className="text-xs font-mono text-base-content/70">
                        {step}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <span className="text-xs italic text-base-content/40">No steps recorded</span>
                )}
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const renderGroupSection = (domain: string, memories: AgentMemory[]) => {
    return (
      <div key={domain} className="mb-4">
        <div className="flex items-center gap-2 mb-2 px-2">
          <span className="font-semibold text-sm">{domain}</span>
          <span className="badge badge-sm badge-ghost">{memories.length}</span>
        </div>
        <table className="table table-zebra table-xs w-full">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={memories.every(m => m.id != null && selectedIds.has(m.id))}
                  onChange={() => {
                    const allSelected = memories.every(m => m.id != null && selectedIds.has(m.id));
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      for (const m of memories) {
                        if (m.id != null) {
                          if (allSelected) {
                            next.delete(m.id);
                          } else {
                            next.add(m.id);
                          }
                        }
                      }
                      return next;
                    });
                  }}
                  aria-label={`Select all memories for ${domain}`}
                />
              </th>
              <th>Domain</th>
              <th>Task Description</th>
              <th className="text-center w-20">Steps</th>
              <th className="w-20">Source</th>
              <th className="w-36">Created</th>
              <th className="w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {memories.map(renderMemoryRow)}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-xl flex items-center gap-2">
            <span aria-hidden="true">🧠</span>
            {t('Memory Management')}
          </h2>
          <p className="text-sm text-base-content/70">
            {t('BrowserBee stores memories of successful interactions with websites to improve future performance. View, edit, delete, or export your memories below.')}
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <div className="stat px-2 py-1 min-w-0">
              <div className="stat-title text-xs">{t('Total Memories')}</div>
              <div className="stat-value text-xl">{allMemories.length}</div>
            </div>
            <div className="stat px-2 py-1 min-w-0">
              <div className="stat-title text-xs">{t('Domains')}</div>
              <div className="stat-value text-xl">{domainCount}</div>
            </div>
            <div className="stat px-2 py-1 min-w-0">
              <div className="stat-title text-xs">{t('Selected')}</div>
              <div className="stat-value text-xl">{selectedIds.size}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search / Filter Bar ── */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="form-control flex-1 min-w-[200px]">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-sm" aria-hidden="true">
                  🔍
                </span>
                <input
                  type="text"
                  className="input input-bordered input-sm w-full pl-8"
                  placeholder={t('Search by domain or task...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search memories"
                />
              </div>
            </div>

            {/* Filter chips */}
            <div className="join" role="group" aria-label="Memory source filter">
              {(['all', 'pre-built', 'user'] as FilterMode[]).map((mode) => (
                <button
                  key={mode}
                  className={`join-item btn btn-sm ${filterMode === mode ? 'btn-active' : ''}`}
                  onClick={() => setFilterMode(mode)}
                  aria-pressed={filterMode === mode}
                >
                  {mode === 'all' ? t('All') : mode === 'pre-built' ? t('Pre-built') : t('User')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body py-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Select all */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={filteredMemories.length > 0 && allVisibleSelected}
                onChange={toggleSelectAll}
                disabled={filteredMemories.length === 0}
                aria-label="Select all visible memories"
              />
              {t('Select all')} ({filteredMemories.length})
            </label>

            <div className="divider divider-horizontal mx-1" />

            {/* Batch delete */}
            <button
              className="btn btn-ghost btn-xs text-error"
              disabled={selectedIds.size === 0}
              onClick={handleBatchDelete}
              aria-label="Delete selected memories"
            >
              🗑️ {t('Delete Selected')} ({selectedIds.size})
            </button>

            {/* Clear all */}
            <button
              className="btn btn-ghost btn-xs text-error"
              disabled={allMemories.length === 0}
              onClick={handleClearAll}
              aria-label="Clear all memories"
            >
              🚫 {t('Clear All')}
            </button>

            <div className="divider divider-horizontal mx-1" />

            {/* Export */}
            <button
              className="btn btn-ghost btn-xs"
              disabled={allMemories.length === 0}
              onClick={handleExport}
              aria-label="Export memories"
            >
              📤 {t('Export')}
            </button>

            {/* Import */}
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Import memories"
            >
              📥 {t('Import')}
            </button>

            {/* Hidden file input for import */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".json"
              className="hidden"
            />

            {/* Refresh */}
            <button
              className="btn btn-ghost btn-xs ml-auto"
              onClick={loadMemories}
              disabled={loading}
              aria-label="Refresh memories"
              title="Refresh"
            >
              🔄 {t('Refresh')}
            </button>
          </div>

          {/* Status messages */}
          {(exportStatus || importStatus) && (
            <div className="mt-2">
              {exportStatus && (
                <div className={`alert text-sm py-1.5 ${exportStatus.includes('Error') ? 'alert-error' : 'alert-success'}`}>
                  {exportStatus}
                </div>
              )}
              {importStatus && (
                <div className={`alert text-sm py-1.5 ${importStatus.includes('Error') ? 'alert-error' : 'alert-success'}`}>
                  {importStatus}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Error display ── */}
      {error && (
        <div className="alert alert-error text-sm" role="alert">
          <span>❌ {error}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* ── Memory list ── */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          {loading ? (
            /* Loading skeleton */
            <div className="space-y-3">
              <div className="skeleton h-8 w-full" />
              <div className="skeleton h-6 w-3/4" />
              <div className="skeleton h-6 w-1/2" />
              <div className="skeleton h-6 w-5/6" />
              <div className="skeleton h-6 w-2/3" />
            </div>
          ) : allMemories.length === 0 ? (
            /* Empty state */
            <div className="text-center py-8 text-base-content/50">
              <div className="text-3xl mb-3" aria-hidden="true">🧠</div>
              <p className="font-medium text-lg mb-1">{t('No memories yet')}</p>
              <p className="text-sm">
                {t('Memories will be created automatically when BrowserBee completes tasks on websites. You can also import memories from a JSON backup.')}
              </p>
            </div>
          ) : Object.keys(groupedMemories).length === 0 ? (
            /* No results for filter */
            <div className="text-center py-8 text-base-content/50">
              <div className="text-3xl mb-3" aria-hidden="true">🔍</div>
              <p className="font-medium text-lg mb-1">No matching memories</p>
              <p className="text-sm">
                Try a different search term or filter selection.
              </p>
            </div>
          ) : (
            /* Grouped memory sections */
            <div className="space-y-2">
              {Object.entries(groupedMemories).map(([domain, memories]) =>
                renderGroupSection(domain, memories)
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirm Modal ── */}
      <MemoryDeleteConfirm
        open={deleteTarget !== null}
        title={
          deleteTarget?.type === 'all'
            ? 'Clear All Memories'
            : deleteTarget?.type === 'batch'
              ? `Delete ${deleteTarget.ids.length} Memories`
              : 'Delete Memory'
        }
        description={
          deleteTarget?.type === 'all'
            ? 'This will permanently remove all stored memories.'
            : undefined
        }
        items={deleteTarget?.items || []}
        confirmLabel={
          deleteTarget?.type === 'all' ? 'Clear All' : 'Delete'
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Clear All Confirm ── */}
      <MemoryDeleteConfirm
        open={showClearConfirm}
        title="Clear All Memories"
        description="This will permanently remove all stored memories across all domains."
        items={allMemories.slice(0, 5).map(m => ({
          domain: m.domain,
          taskDescription: m.taskDescription,
        }))}
        confirmLabel="Clear All"
        onConfirm={confirmClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />

      {/* ── Edit Modal ── */}
      <MemoryEditModal
        open={showEditModal}
        memory={editingMemory}
        onSave={confirmEdit}
        onCancel={() => {
          setShowEditModal(false);
          setEditingMemory(null);
        }}
      />
    </div>
  );
}
