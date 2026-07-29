// ================================================================
// API Service — Frontend → Backend Communication
// ================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Restore tokens from localStorage on init
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, { ...options, headers });

    // Handle 401 — try to refresh token
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(url, { ...options, headers });
        if (!retryResponse.ok) throw await this.parseError(retryResponse);
        return retryResponse.json();
      }
    }

    if (!response.ok) throw await this.parseError(response);
    return response.json();
  }

  private async parseError(response: Response) {
    try {
      const body = await response.json();
      return { status: response.status, ...body };
    } catch {
      return { status: response.status, message: response.statusText };
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!response.ok) {
        this.clearTokens();
        return false;
      }
      const data = await response.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  // ==========================================
  // AUTH ENDPOINTS
  // ==========================================
  async login(username: string, password: string) {
    const data = await this.request<{
      user: any;
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  async getProfile() {
    return this.request<any>('/auth/me');
  }

  // ==========================================
  // USERS
  // ==========================================
  async getUsers() {
    return this.request<any[]>('/users');
  }

  async createUser(data: { username: string; email: string; password: string; fullName: string; roleId: string }) {
    return this.request<any>('/users', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateUser(id: string, data: any) {
    return this.request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteUser(id: string) {
    return this.request<any>(`/users/${id}`, { method: 'DELETE' });
  }

  // ==========================================
  // LICENSES
  // ==========================================
  async getLicense() {
    return this.request<any>('/licenses');
  }

  async activateModule(code: string, key: string) {
    return this.request<any>(`/licenses/modules/${code}/activate`, {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
  }

  async deactivateModule(code: string) {
    return this.request<any>(`/licenses/modules/${code}/deactivate`, { method: 'POST' });
  }

  async getLicenseHistory(limit = 50) {
    return this.request<any[]>(`/licenses/history?limit=${limit}`);
  }

  // ==========================================
  // HEALTH
  // ==========================================
  async getHealth() {
    return this.request<any>('/health');
  }

  async getReadiness() {
    return this.request<any>('/health/ready');
  }
}

// Singleton
const api = new ApiService();
export default api;
