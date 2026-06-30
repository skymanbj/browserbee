import { CloudSyncProvider } from './syncManager';

export class WebDAVSyncProvider implements CloudSyncProvider {
  private url: string;
  private authHeader: string;

  constructor(url: string, username: string, password: string) {
    this.url = url.endsWith('/') ? url : `${url}/`;
    // Encodes username:password in basic authorization scheme
    this.authHeader = `Basic ${btoa(`${username}:${password}`)}`;
  }

  private getFileUrl(): string {
    return `${this.url}browserbee-all-data.json`;
  }

  public async upload(data: string): Promise<{ success: boolean; error?: string }> {
    try {
      const fileUrl = this.getFileUrl();
      const res = await fetch(fileUrl, {
        method: 'PUT',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
        },
        body: data,
      });

      if (res.status >= 200 && res.status < 300) {
        return { success: true };
      } else {
        return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
      }
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  public async download(): Promise<{ success: boolean; data: string; error?: string }> {
    try {
      const fileUrl = this.getFileUrl();
      const res = await fetch(fileUrl, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
        },
      });

      if (res.status === 200) {
        const text = await res.text();
        return { success: true, data: text };
      } else if (res.status === 404) {
        return { success: false, data: '', error: '404: File not found on WebDAV server' };
      } else {
        return { success: false, data: '', error: `HTTP ${res.status}: ${res.statusText}` };
      }
    } catch (e: any) {
      return { success: false, data: '', error: e.message || String(e) };
    }
  }

  /**
   * Static helper to test WebDAV connectivity using Depth 0 PROPFIND request.
   */
  public static async testConnection(url: string, username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const targetUrl = url.endsWith('/') ? url : `${url}/`;
      const authHeader = `Basic ${btoa(`${username}:${password}`)}`;
      const res = await fetch(targetUrl, {
        method: 'PROPFIND',
        headers: {
          'Authorization': authHeader,
          'Depth': '0',
        },
      });

      if (res.status >= 200 && res.status < 300) {
        return { success: true };
      } else {
        return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
      }
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }
}
