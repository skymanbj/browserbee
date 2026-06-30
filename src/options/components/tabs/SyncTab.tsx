import { useCallback, useEffect, useState } from 'react';
import { hasHostPermission, requestHostPermission } from '../../../background/permissions';
import { useAppSelector } from '../../../store/hooks';
import { MemoryService } from '../../../tracking/memoryService';
import { PromptTemplateService } from '../../../tracking/promptTemplateService';
import { GoogleDriveSyncProvider } from '../../../tracking/sync/googleDriveProvider';
import { CloudSyncProvider, SyncManager } from '../../../tracking/sync/syncManager';
import { WebDAVSyncProvider } from '../../../tracking/sync/webdavProvider';

export function SyncTab() {
  const language = useAppSelector((state) => state.settings.language);

  const t = (key: string): string => {
    const cleanKey = key.trim();
    const translationDict: Record<string, Record<string, string>> = {
      'Cloud Sync': { zh: '云同步', en: 'Cloud Sync' }
    };
    const translated = translationDict[cleanKey]?.[language];
    return translated ?? key;
  };

  // ── Configuration State ─────────────────────────────────────
  const [syncType, setSyncType] = useState<'none' | 'webdav' | 'googledrive'>('none');

  // WebDAV fields
  const [webdavUrl, setWebdavUrl] = useState('');
  const [webdavUsername, setWebdavUsername] = useState('');
  const [webdavPassword, setWebdavPassword] = useState('');

  // Google Drive fields
  const [gdriveClientId, setGdriveClientId] = useState('');
  const [gdriveClientSecret, setGdriveClientSecret] = useState('');
  const [isGdriveAuthorized, setIsGdriveAuthorized] = useState(false);

  // ── Sync Info & Stats State ───────────────────────────────
  const [lastSynced, setLastSynced] = useState<number>(0);
  const [stats, setStats] = useState({
    memories: 0,
    prompts: 0,
    tasks: 0,
    sessions: 0,
  });

  // ── UI Control State ────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  // Load configs and stats on mount
  const loadStatsAndConfigs = useCallback(async () => {
    try {
      // 1. Load Stats
      const memoryService = MemoryService.getInstance();
      await memoryService.init();
      const memoriesCount = await memoryService.countMemories();

      const promptService = PromptTemplateService.getInstance();
      const prompts = (await promptService.getAll()).filter(p => !p.isBuiltIn);

      const localData = await chrome.storage.local.get(null);
      const tasks = (localData['browserbee_scheduled_tasks'] as any[] || []).filter(t => !t.isBuiltIn);
      const sessions = localData['browserbee_sessions'] as any[] || [];

      setStats({
        memories: memoriesCount,
        prompts: prompts.length,
        tasks: tasks.length,
        sessions: sessions.length,
      });

      // 2. Load Sync configuration
      const config = await chrome.storage.local.get({
        syncType: 'none',
        webdavUrl: '',
        webdavUsername: '',
        webdavPassword: '',
        gdriveClientId: '',
        gdriveClientSecret: '',
        gdriveRefreshToken: '',
        lastSynced: 0,
      });

      setSyncType(config.syncType);
      setWebdavUrl(config.webdavUrl);
      setWebdavUsername(config.webdavUsername);
      setWebdavPassword(config.webdavPassword);
      setGdriveClientId(config.gdriveClientId);
      setGdriveClientSecret(config.gdriveClientSecret);
      setIsGdriveAuthorized(!!config.gdriveRefreshToken);
      setLastSynced(config.lastSynced || 0);

    } catch (err: any) {
      console.error('Failed to load sync configurations', err);
    }
  }, []);

  useEffect(() => {
    loadStatsAndConfigs();
  }, [loadStatsAndConfigs]);

  // Save changes to chrome.storage
  const handleSaveConfig = async (type: typeof syncType) => {
    setSyncType(type);
    await chrome.storage.local.set({
      syncType: type,
      webdavUrl,
      webdavUsername,
      webdavPassword,
      gdriveClientId,
      gdriveClientSecret,
    });
  };

  // ── Providers Creation ─────────────────────────────────────
  const getActiveProvider = async (): Promise<CloudSyncProvider | null> => {
    if (syncType === 'webdav') {
      if (!webdavUrl || !webdavUsername || !webdavPassword) {
        throw new Error('Please fill in all WebDAV fields first.');
      }
      // Request host permission for the WebDAV URL if not already granted
      const hostGranted = await hasHostPermission(webdavUrl);
      if (!hostGranted) {
        const requested = await requestHostPermission(webdavUrl);
        if (!requested) {
          throw new Error('Permission to access the WebDAV server was denied by user.');
        }
      }
      return new WebDAVSyncProvider(webdavUrl, webdavUsername, webdavPassword);
    }

    if (syncType === 'googledrive') {
      const config = await chrome.storage.local.get({
        gdriveClientId: '',
        gdriveClientSecret: '',
        gdriveAccessToken: '',
        gdriveRefreshToken: '',
        gdriveTokenExpiry: 0,
      });

      if (!config.gdriveRefreshToken) {
        throw new Error('Please authorize Google Drive access first.');
      }

      return new GoogleDriveSyncProvider(
        config.gdriveClientId,
        config.gdriveClientSecret,
        config.gdriveAccessToken,
        config.gdriveRefreshToken,
        config.gdriveTokenExpiry
      );
    }

    return null;
  };

  // ── Operations Handlers ─────────────────────────────────────

  // Test WebDAV
  const handleTestWebDAV = async () => {
    if (!webdavUrl || !webdavUsername || !webdavPassword) {
      showStatus('error', 'Please fill in all WebDAV configuration fields.');
      return;
    }
    setLoading(true);
    try {
      // Request host permission for the WebDAV URL if not already granted
      const hostGranted = await hasHostPermission(webdavUrl);
      if (!hostGranted) {
        const requested = await requestHostPermission(webdavUrl);
        if (!requested) {
          showStatus('error', 'Permission to access the WebDAV server was denied by user.');
          setLoading(false);
          return;
        }
      }

      const res = await WebDAVSyncProvider.testConnection(webdavUrl, webdavUsername, webdavPassword);
      if (res.success) {
        showStatus('success', t('Connection OK!'));
        await handleSaveConfig('webdav');
      } else {
        showStatus('error', res.error || 'Failed to connect to WebDAV.');
      }
    } catch (e: any) {
      showStatus('error', e.message || 'Error occurred during connection test.');
    } finally {
      setLoading(false);
    }
  };

  // Google Drive Authorization
  const handleGoogleAuthorize = async () => {
    if (!gdriveClientId || !gdriveClientSecret) {
      showStatus('error', 'Please fill in both Client ID and Client Secret.');
      return;
    }
    setLoading(true);
    try {
      const res = await GoogleDriveSyncProvider.authorize(gdriveClientId, gdriveClientSecret);
      if (res.success) {
        showStatus('success', 'Google Drive authorized successfully!');
        setIsGdriveAuthorized(true);
        setSyncType('googledrive');
      } else {
        showStatus('error', res.error || 'Failed to authorize Google Drive.');
      }
    } catch (e: any) {
      showStatus('error', e.message || 'Error occurred during Google Drive authorization.');
    } finally {
      setLoading(false);
    }
  };

  // Google Drive Disconnect
  const handleDisconnectGdrive = async () => {
    setLoading(true);
    try {
      await chrome.storage.local.remove([
        'gdriveClientId',
        'gdriveClientSecret',
        'gdriveAccessToken',
        'gdriveRefreshToken',
        'gdriveTokenExpiry',
      ]);
      setGdriveClientId('');
      setGdriveClientSecret('');
      setIsGdriveAuthorized(false);
      await handleSaveConfig('none');
      showStatus('success', 'Google Drive disconnected successfully.');
    } catch (e: any) {
      showStatus('error', e.message || 'Error disconnecting Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  const updateLastSyncedTime = async () => {
    const now = Date.now();
    setLastSynced(now);
    await chrome.storage.local.set({ lastSynced: now });
  };

  // Smart Sync (Merge)
  const triggerMergeSync = async () => {
    setLoading(true);
    try {
      const provider = await getActiveProvider();
      if (!provider) {
        showStatus('error', 'Please select and configure a sync provider first.');
        return;
      }
      const res = await SyncManager.getInstance().mergeAllData(provider);
      if (res.uploaded) {
        showStatus('success', `Sync Complete: ${res.details}`);
        await updateLastSyncedTime();
        await loadStatsAndConfigs();
      }
    } catch (e: any) {
      showStatus('error', `Sync failed: ${e.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  // Backup to Cloud
  const triggerBackupToCloud = async () => {
    setLoading(true);
    try {
      const provider = await getActiveProvider();
      if (!provider) {
        showStatus('error', 'Please select and configure a sync provider first.');
        return;
      }
      const allData = await SyncManager.getInstance().exportAllData();
      const res = await provider.upload(JSON.stringify(allData, null, 2));
      if (res.success) {
        showStatus('success', 'Backup Complete: Local data uploaded and overwrote cloud file.');
        await updateLastSyncedTime();
      } else {
        showStatus('error', res.error || 'Failed to upload backup.');
      }
    } catch (e: any) {
      showStatus('error', `Backup failed: ${e.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  // Restore from Cloud
  const triggerRestoreFromCloud = async () => {
    const confirmRestore = window.confirm(
      'WARNING: Restoring will overwrite all local settings, memories, templates, sessions, and tasks. This action CANNOT be undone. Are you sure you want to proceed?'
    );
    if (!confirmRestore) return;

    setLoading(true);
    try {
      const provider = await getActiveProvider();
      if (!provider) {
        showStatus('error', 'Please select and configure a sync provider first.');
        return;
      }
      const res = await provider.download();
      if (res.success) {
        const backupData = JSON.parse(res.data);
        await SyncManager.getInstance().restoreAllData(backupData);
        showStatus('success', 'Restore Complete: Local data successfully replaced by cloud backup.');
        await updateLastSyncedTime();
        await loadStatsAndConfigs();
      } else {
        showStatus('error', res.error || 'Failed to download cloud data.');
      }
    } catch (e: any) {
      showStatus('error', `Restore failed: ${e.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return t('Never');
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* ── Header Card ── */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-xl flex items-center gap-2">
            <span>☁️</span>
            {t('Cloud Sync Management')}
          </h2>
          <p className="text-sm text-base-content/70">
            {t('Configure cloud providers (Google Drive or WebDAV) to backup, restore, or merge all your extension data.')}
          </p>

          {/* Stats Summary */}
          <div className="stats stats-vertical md:stats-horizontal shadow-sm bg-base-200/50 mt-4">
            <div className="stat">
              <div className="stat-title text-xs">{t('🧠 Interaction Memories')}</div>
              <div className="stat-value text-lg text-primary">{stats.memories}</div>
            </div>
            <div className="stat">
              <div className="stat-title text-xs">{t('📋 Prompt Templates')}</div>
              <div className="stat-value text-lg text-info">{stats.prompts}</div>
            </div>
            <div className="stat">
              <div className="stat-title text-xs">{t('⏰ Scheduled Tasks')}</div>
              <div className="stat-value text-lg text-warning">{stats.tasks}</div>
            </div>
            <div className="stat">
              <div className="stat-title text-xs">{t('💬 Chat Sessions')}</div>
              <div className="stat-value text-lg text-success">{stats.sessions}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Message Alerts ── */}
      {statusMsg && (
        <div className={`alert text-sm shadow-md ${statusMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          <span>{statusMsg.type === 'success' ? '✅' : '❌'} {statusMsg.text}</span>
        </div>
      )}

      {/* ── Sync Provider Configuration ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Selector Card */}
        <div className="card bg-base-100 shadow-md lg:col-span-1">
          <div className="card-body">
            <h3 className="font-bold text-md mb-2">{t('Sync Provider')}</h3>
            <div className="flex flex-col gap-2">
              <label className="label cursor-pointer justify-start gap-3 bg-base-200/50 rounded px-4 py-2 hover:bg-base-200 transition-colors">
                <input
                  type="radio"
                  name="sync-provider-radio"
                  className="radio radio-primary"
                  checked={syncType === 'none'}
                  onChange={() => handleSaveConfig('none')}
                />
                <span className="text-sm font-medium">{t('Disabled')}</span>
              </label>

              <label className="label cursor-pointer justify-start gap-3 bg-base-200/50 rounded px-4 py-2 hover:bg-base-200 transition-colors">
                <input
                  type="radio"
                  name="sync-provider-radio"
                  className="radio radio-primary"
                  checked={syncType === 'webdav'}
                  onChange={() => handleSaveConfig('webdav')}
                />
                <span className="text-sm font-medium">WebDAV</span>
              </label>

              <label className="label cursor-pointer justify-start gap-3 bg-base-200/50 rounded px-4 py-2 hover:bg-base-200 transition-colors">
                <input
                  type="radio"
                  name="sync-provider-radio"
                  className="radio radio-primary"
                  checked={syncType === 'googledrive'}
                  onChange={() => handleSaveConfig('googledrive')}
                />
                <span className="text-sm font-medium">Google Drive</span>
              </label>
            </div>
          </div>
        </div>

        {/* Configuration Details Card */}
        <div className="card bg-base-100 shadow-md lg:col-span-2">
          <div className="card-body">
            {syncType === 'none' && (
              <div className="flex flex-col items-center justify-center py-12 text-base-content/40">
                <span className="text-4xl mb-2">💤</span>
                <p className="text-sm font-medium">Cloud sync is currently disabled.</p>
                <p className="text-xs">Choose WebDAV or Google Drive to configure.</p>
              </div>
            )}

            {syncType === 'webdav' && (
              <div className="space-y-4">
                <h3 className="font-bold text-md mb-2">WebDAV Settings</h3>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">{t('WebDAV URL')}</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://dav.jianguoyun.com/dav/"
                    className="input input-bordered w-full input-sm"
                    value={webdavUrl}
                    onChange={(e) => setWebdavUrl(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">{t('Username')}</span>
                    </label>
                    <input
                      type="text"
                      placeholder="email@example.com"
                      className="input input-bordered w-full input-sm"
                      value={webdavUsername}
                      onChange={(e) => setWebdavUsername(e.target.value)}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">{t('Password')}</span>
                    </label>
                    <input
                      type="password"
                      placeholder="WebDAV application password"
                      className="input input-bordered w-full input-sm"
                      value={webdavPassword}
                      onChange={(e) => setWebdavPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleTestWebDAV}
                    disabled={loading}
                  >
                    {loading && <span className="loading loading-spinner loading-xs" />}
                    {t('Test Connection')}
                  </button>
                </div>
              </div>
            )}

            {syncType === 'googledrive' && (
              <div className="space-y-4">
                <h3 className="font-bold text-md mb-2">Google Drive Settings</h3>

                {isGdriveAuthorized ? (
                  <div className="alert alert-success py-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <span>🟢</span>
                      <span className="text-sm font-medium">{t('Linked to Google Drive')}</span>
                    </div>
                    <button
                      className="btn btn-ghost btn-xs text-error underline"
                      onClick={handleDisconnectGdrive}
                      disabled={loading}
                    >
                      {t('Disconnect')}
                    </button>
                  </div>
                ) : (
                  <div className="alert alert-warning py-3 text-sm shadow-sm">
                    ⚠️ Connection required. Enter your Google API OAuth credentials below to bind.
                  </div>
                )}

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">{t('Google Drive Client ID')}</span>
                  </label>
                  <input
                    type="text"
                    placeholder="OAuth2 Client ID"
                    className="input input-bordered w-full input-sm"
                    value={gdriveClientId}
                    onChange={(e) => setGdriveClientId(e.target.value)}
                    disabled={isGdriveAuthorized}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">{t('Google Drive Client Secret')}</span>
                  </label>
                  <input
                    type="password"
                    placeholder="OAuth2 Client Secret"
                    className="input input-bordered w-full input-sm"
                    value={gdriveClientSecret}
                    onChange={(e) => setGdriveClientSecret(e.target.value)}
                    disabled={isGdriveAuthorized}
                  />
                </div>

                {!isGdriveAuthorized && (
                  <div className="flex justify-end pt-2">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleGoogleAuthorize}
                      disabled={loading}
                    >
                      {loading && <span className="loading loading-spinner loading-xs" />}
                      {t('Connect & Authorize')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sync Actions Card ── */}
      {syncType !== 'none' && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="font-bold text-md mb-4">{t('Sync Operations')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Merge Sync */}
              <div className="bg-base-200/50 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-sm mb-1">{t('Smart Merge Sync 🔄')}</h4>
                  <p className="text-xs text-base-content/60 mb-4">
                    {t('Merge Sync downloads cloud data, merges it intelligently with your local data, and uploads the merged state back.')}
                  </p>
                </div>
                <button
                  className="btn btn-primary btn-sm w-full mt-auto"
                  onClick={triggerMergeSync}
                  disabled={loading}
                >
                  {loading && <span className="loading loading-spinner loading-xs" />}
                  Sync Now
                </button>
              </div>

              {/* Backup */}
              <div className="bg-base-200/50 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-sm mb-1">{t('Backup to Cloud 📤')}</h4>
                  <p className="text-xs text-base-content/60 mb-4">
                    {t('Backup overwrites the cloud data with your current local data.')}
                  </p>
                </div>
                <button
                  className="btn btn-outline btn-sm w-full mt-auto"
                  onClick={triggerBackupToCloud}
                  disabled={loading}
                >
                  Backup
                </button>
              </div>

              {/* Restore */}
              <div className="bg-base-200/50 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-sm mb-1 text-error">{t('Restore from Cloud 📥')}</h4>
                  <p className="text-xs text-base-content/60 mb-4">
                    {t('Restore overwrites your local data with the cloud backup. All current local data will be replaced.')}
                  </p>
                </div>
                <button
                  className="btn btn-outline btn-error btn-sm w-full mt-auto"
                  onClick={triggerRestoreFromCloud}
                  disabled={loading}
                >
                  Restore
                </button>
              </div>
            </div>

            {/* Sync Status Display */}
            <div className="divider my-4" />
            <div className="flex items-center justify-between text-xs text-base-content/50 px-2">
              <span>{t('Sync Status')}</span>
              <span>
                {t('Last Synced')}: <strong className="text-base-content/80">{formatDate(lastSynced)}</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
