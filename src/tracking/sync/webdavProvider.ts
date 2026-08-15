import { CloudSyncProvider } from './syncManager';

export class WebDAVSyncProvider implements CloudSyncProvider {
  private url: string;
  private authHeader: string;

  constructor(url: string, username: string, password: string) {
    const normalized = url.endsWith('/') ? url : `${url}/`;
    this.url = normalized.endsWith('broswerbee/') ? normalized : `${normalized}broswerbee/`;
    this.authHeader = `Basic ${btoa(`${username}:${password}`)}`;
  }

  private getFileUrl(): string {
    return `${this.url}browserbee-all-data.json`;
  }

  private async ensureDirectory(): Promise<void> {
    try {
      const res = await fetch(this.url, {
        method: 'MKCOL',
        headers: {
          'Authorization': this.authHeader,
        },
      });
      if (res.status >= 200 && res.status < 300) {
        return;
      }
      if (res.status === 405) {
        return;
      }
      console.warn('[WebDAV] ensureDirectory non-OK status:', res.status, await res.text().catch(() => ''));
    } catch (e) {
      console.warn('[WebDAV] ensureDirectory fetch error:', e);
    }
  }

  public async upload(data: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensureDirectory();

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
        const body = await res.text().catch(() => '');
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

      if (res.status >= 200 && res.status < 300) {
        const text = await res.text();
        return { success: true, data: text };
      } else if (res.status >= 400 && res.status < 500) {
        return { success: false, data: '', error: `404: File not found (HTTP ${res.status})` };
      } else {
        const body = await res.text().catch(() => '');
        return { success: false, data: '', error: `HTTP ${res.status}: ${res.statusText}` };
      }
    } catch (e: any) {
      return { success: false, data: '', error: e.message || String(e) };
    }
  }

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