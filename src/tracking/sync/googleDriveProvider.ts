import { CloudSyncProvider } from './syncManager';

export class GoogleDriveSyncProvider implements CloudSyncProvider {
  private clientId: string;
  private clientSecret: string;
  private accessTokenVal: string;
  private refreshTokenVal: string;
  private expiresAt: number; // absolute timestamp in ms

  constructor(clientId: string, clientSecret: string, accessToken: string, refreshToken: string, expiresAt: number) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessTokenVal = accessToken;
    this.refreshTokenVal = refreshToken;
    this.expiresAt = expiresAt;
  }

  /**
   * Ensures the access token is valid (not expired). If expired, uses refresh token to get a new one.
   * Returns a valid access token, or throws an error.
   */
  private async getValidToken(): Promise<string> {
    const isExpired = Date.now() >= (this.expiresAt - 300 * 1000); // refresh 5 mins early
    if (!isExpired && this.accessTokenVal) {
      return this.accessTokenVal;
    }

    if (!this.refreshTokenVal) {
      throw new Error('Access token expired and no refresh token available. Please re-authorize Google Drive.');
    }

    try {
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshTokenVal,
        grant_type: 'refresh_token',
      });

      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Token refresh failed: ${res.status} ${errText}`);
      }

      const tokenData = await res.json();
      this.accessTokenVal = tokenData.access_token;
      // Google doesn't always return a new refresh token, keep the existing one if not returned
      if (tokenData.refresh_token) {
        this.refreshTokenVal = tokenData.refresh_token;
      }
      this.expiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

      // Update storage so settings page and future calls get updated token state
      await chrome.storage.local.set({
        gdriveAccessToken: this.accessTokenVal,
        gdriveRefreshToken: this.refreshTokenVal,
        gdriveTokenExpiry: this.expiresAt,
      });

      return this.accessTokenVal;
    } catch (e: any) {
      throw new Error(`Failed to refresh Google Drive token: ${e.message || String(e)}`);
    }
  }

  /**
   * Finds the file ID of browserbee-all-data.json in user's Drive.
   * Returns the file ID, or null if not found.
   */
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

  public async upload(data: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getValidToken();
      const fileId = await this.findFileId(token);

      if (fileId) {
        // Update existing file content
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
        // Create new file using multipart/form-data
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
      const token = await this.getValidToken();
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

  /**
   * Helper to initialize the OAuth flow and fetch/store credentials.
   * Triggers chrome.identity.launchWebAuthFlow.
   */
  public static async authorize(clientId: string, clientSecret: string): Promise<{ success: boolean; error?: string }> {
    try {
      const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
      const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file');
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

      return new Promise((resolve) => {
        chrome.identity.launchWebAuthFlow({
          url: authUrl,
          interactive: true,
        }, async (redirectUrl) => {
          if (chrome.runtime.lastError || !redirectUrl) {
            resolve({
              success: false,
              error: chrome.runtime.lastError?.message || 'Authentication window closed or blocked.',
            });
            return;
          }

          try {
            // Extract the auth code from the redirect URL
            const urlObj = new URL(redirectUrl);
            const code = urlObj.searchParams.get('code');
            if (!code) {
              resolve({ success: false, error: 'Authorization code not found in redirect.' });
              return;
            }

            // Exchange authorization code for tokens
            const tokenUrl = 'https://oauth2.googleapis.com/token';
            const params = new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code',
            });

            const res = await fetch(tokenUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params.toString(),
            });

            if (!res.ok) {
              const errText = await res.text();
              resolve({ success: false, error: `Token exchange failed: ${res.status} ${errText}` });
              return;
            }

            const tokenData = await res.json();
            const expiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

            // Save details to chrome.storage.local
            await chrome.storage.local.set({
              gdriveClientId: clientId,
              gdriveClientSecret: clientSecret,
              gdriveAccessToken: tokenData.access_token,
              gdriveRefreshToken: tokenData.refresh_token,
              gdriveTokenExpiry: expiresAt,
              syncType: 'googledrive',
            });

            resolve({ success: true });
          } catch (e: any) {
            resolve({ success: false, error: `Failed to exchange token: ${e.message || String(e)}` });
          }
        });
      });
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }
}
