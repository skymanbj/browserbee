import { CloudSyncProvider } from './syncManager';

export class GoogleDriveSyncProvider implements CloudSyncProvider {
  private static getToken(interactive = false): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!token) {
          reject(new Error('No token returned'));
        } else {
          resolve(token);
        }
      });
    });
  }

  public async upload(data: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await GoogleDriveSyncProvider.getToken(false);
      const fileId = await this.findFileId(token);

      if (fileId) {
        const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
        const res = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: data,
        });

        if (res.ok) {
          return { success: true };
        } else {
          const err = await res.text();
          return { success: false, error: `Upload update failed: ${res.status} ${err}` };
        }
      } else {
        const metadata = {
          name: 'browserbee-all-data.json',
          mimeType: 'application/json',
        };

        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', new Blob([data], { type: 'application/json' }));

        const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        const res = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (res.ok) {
          return { success: true };
        } else {
          const err = await res.text();
          return { success: false, error: `Upload create failed: ${res.status} ${err}` };
        }
      }
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  public async download(): Promise<{ success: boolean; data: string; error?: string }> {
    try {
      const token = await GoogleDriveSyncProvider.getToken(false);
      const fileId = await this.findFileId(token);

      if (!fileId) {
        return { success: false, data: '', error: 'File not found' };
      }

      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const res = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const text = await res.text();
        return { success: true, data: text };
      } else {
        const err = await res.text();
        return { success: false, data: '', error: `Download failed: ${res.status} ${err}` };
      }
    } catch (e: any) {
      return { success: false, data: '', error: e.message || String(e) };
    }
  }

  private async findFileId(token: string): Promise<string | null> {
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='browserbee-all-data.json' and trashed=false")}&spaces=drive`;
    const res = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive search failed: ${res.status} ${err}`);
    }

    const searchResult = await res.json();
    if (searchResult.files && searchResult.files.length > 0) {
      return searchResult.files[0].id;
    }
    return null;
  }

  public static async authorize(): Promise<{ success: boolean; error?: string }> {
    try {
      await GoogleDriveSyncProvider.getToken(true);
      await chrome.storage.local.set({ syncType: 'googledrive' });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  public static async disconnect(): Promise<void> {
    return new Promise<void>((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, async (token) => {
        if (token) {
          try {
            await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
          } catch {}
          chrome.identity.removeCachedAuthToken({ token }, () => {
            chrome.storage.local.remove([
              'gdriveAccessToken',
              'gdriveRefreshToken',
              'gdriveTokenExpiry',
            ]);
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  }

  public static async isAuthorized(): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        resolve(!!token);
      });
    });
  }
}