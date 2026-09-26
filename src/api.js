/**
 * PrajaSeva Portal - Universal Frontend API Client
 * Seamlessly connects dynamically to Python FastAPI (:8000) or Node.js Express (:5000)
 * Provides automatic failover, JWT authorization headers, and offline fallback.
 */

const envApiUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || '';

function getBackendCandidates() {
  const list = [];
  if (envApiUrl) {
    list.push({ url: envApiUrl.replace(/\/+$/, ''), name: 'Configured API (VITE_API_URL)' });
  }
  if (typeof window !== 'undefined' && window.location) {
    const loc = window.location;
    if (loc.origin && loc.origin !== 'null') {
      list.push({ url: loc.origin, name: 'Same-Origin Gateway' });
    }
    if (loc.hostname && loc.hostname !== 'localhost' && loc.hostname !== '127.0.0.1') {
      list.push({ url: `${loc.protocol}//${loc.hostname}:8000`, name: 'Python FastAPI (LAN)' });
      list.push({ url: `${loc.protocol}//${loc.hostname}:5000`, name: 'Node.js Express (LAN)' });
    }
  }
  list.push(
    { url: 'http://127.0.0.1:8000', name: 'Python FastAPI (:8000)' },
    { url: 'http://127.0.0.1:5000', name: 'Node.js Express (:5000)' },
    { url: 'http://localhost:8000', name: 'Python FastAPI (:8000)' },
    { url: 'http://localhost:5000', name: 'Node.js Express (:5000)' }
  );
  const seen = new Set();
  return list.filter(c => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

let activeBackend = null;
let isOfflineFallback = false;

export function getAuthToken() {
  return localStorage.getItem('prajaseva_jwt') || '';
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('prajaseva_jwt', token);
  } else {
    localStorage.removeItem('prajaseva_jwt');
  }
}

// Auto-detect active backend with instant Promise.any resolution
let detectPromise = null;

export async function detectBackend() {
  if (activeBackend) return activeBackend;
  if (detectPromise) return detectPromise;

  detectPromise = (async () => {
    const candidates = getBackendCandidates();
    const probe = async (candidate) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      try {
        const res = await fetch(`${candidate.url}/api/health`, {
          signal: controller.signal,
          cache: 'no-store'
        });
        if (!res.ok) throw new Error('Status not OK');
        const data = await res.json();
        return {
          url: candidate.url,
          name: data.runtime || candidate.name,
          docs: data.docs ? `${candidate.url}${data.docs}` : candidate.docs,
          state: data.state || 'India'
        };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    try {
      // Promise.any resolves as soon as ANY healthy backend responds (typically <5ms)
      const connected = await Promise.any(candidates.map(probe));
      activeBackend = connected;
      isOfflineFallback = false;
      console.log(`[PrajaSeva API] Connected to ${activeBackend.name}`);
      return activeBackend;
    } catch (e) {
      isOfflineFallback = true;
      activeBackend = null;
      console.warn('[PrajaSeva API] No live backend is available. Live user data is required.');
      return null;
    } finally {
      detectPromise = null;
    }
  })();

  return detectPromise;
}

export function getActiveBackend() {
  return activeBackend;
}

async function request(endpoint, options = {}) {
  if (!activeBackend) {
    await detectBackend();
  }

  if (activeBackend && activeBackend.url) {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const res = await fetch(`${activeBackend.url}${endpoint}`, {
      headers,
      ...options
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.error || `HTTP Error ${res.status}`);
    }
    return await res.json();
  }

  return null;
}

// ----------------- API Service Interface -----------------

export const api = {
  detectBackend,
  getActiveBackend,
  getAuthToken,
  setAuthToken,

  // 1. Authentication
  async login(credential, password, role = 'citizen') {
    const isEmail = credential.includes('@');
    const payload = isEmail ? { email: credential, password, role } : { credential, password, role };

    const remote = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (remote && (remote.access_token || remote.token)) {
      const token = remote.access_token || remote.token;
      setAuthToken(token);
      return remote;
    }

    throw new Error('Invalid mobile/email or password.');
  },

  async register(userData) {
    const remote = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (remote && (remote.success || remote.user)) {
      return remote;
    }
    throw new Error(remote?.detail || remote?.error || 'Registration failed. Please check your details and try again.');
  },

  async getMe() {
    return await request('/api/auth/me');
  },

  // 2. Profile Management
  async getProfile() {
    const remote = await request('/api/profile');
    if (remote && remote.name) {
      return remote;
    }
    return null;
  },

  async saveProfile(profileData) {
    const remote = await request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    if (remote && remote.name) {
      return remote;
    }
    throw new Error('Live backend unavailable. Profile data was not saved.');
  },

  async getNotifications() {
    const remote = await request('/api/profile/notifications');
    if (Array.isArray(remote)) return remote;
    return [];
  },

  // 3. Departments & Schemes
  async getDepartments() {
    const remote = await request('/api/departments');
    if (Array.isArray(remote)) return remote;
    return [];
  },

  async getSchemes(deptId = null) {
    const endpoint = deptId ? `/api/schemes?department_id=${encodeURIComponent(deptId)}` : '/api/schemes';
    const remote = await request(endpoint);
    if (Array.isArray(remote)) return remote;
    return [];
  },

  async checkEligibility(criteria) {
    const remote = await request('/api/schemes/check-eligibility', {
      method: 'POST',
      body: JSON.stringify(criteria)
    });
    if (remote && typeof remote.eligible === 'boolean') {
      return remote;
    }

    return null;
  },

  // 4. Applications
  async getApplications() {
    const remote = await request('/api/applications');
    if (Array.isArray(remote)) {
      return remote;
    }
    return [];
  },

  async submitApplication(applicationData) {
    const remote = await request('/api/applications', {
      method: 'POST',
      body: JSON.stringify(applicationData)
    });
    if (remote && remote.id) {
      return remote;
    }

    throw new Error('Live backend unavailable. Application was not submitted.');
  },

  async trackApplication(appId) {
    const cleanId = (appId || '').trim();
    const remote = await request(`/api/applications/track/${encodeURIComponent(cleanId)}`);
    if (remote && remote.id) return remote;

    return null;
  },

  // 5. Grievances
  async getGrievances() {
    const remote = await request('/api/grievances');
    if (Array.isArray(remote)) {
      return remote;
    }
    return [];
  },

  async submitGrievance(grievanceData) {
    const remote = await request('/api/grievances', {
      method: 'POST',
      body: JSON.stringify(grievanceData)
    });
    if (remote && remote.id) {
      return remote;
    }

    throw new Error('Live backend unavailable. Grievance was not submitted.');
  },

  async trackGrievance(grvId) {
    const cleanId = (grvId || '').trim();
    const remote = await request(`/api/grievances/track/${encodeURIComponent(cleanId)}`);
    if (remote && remote.id) return remote;

    return null;
  },

  // 6. Officer & Admin Controls
  async getAdminStats() {
    const remote = await request('/api/admin/stats');
    if (remote && remote.applications) return remote;
    return null;
  },

  async reviewApplication(appId, reviewData) {
    return await request(`/api/admin/applications/${encodeURIComponent(appId)}/status`, {
      method: 'PUT',
      body: JSON.stringify(reviewData)
    });
  },

  async resolveGrievance(grvId, resolveData) {
    return await request(`/api/admin/grievances/${encodeURIComponent(grvId)}/status`, {
      method: 'PUT',
      body: JSON.stringify(resolveData)
    });
  },

  async getRoleApplications(role = 'admin') {
    const endpoint = role === 'department' ? '/api/admin/applications' : '/api/admin/applications';
    const remote = await request(endpoint);
    return Array.isArray(remote) ? remote : [];
  },

  async getRoleGrievances(role = 'admin') {
    const endpoint = role === 'department' ? '/api/admin/grievances' : '/api/admin/grievances';
    const remote = await request(endpoint);
    return Array.isArray(remote) ? remote : [];
  },

  async getRoleStats() {
    const remote = await request('/api/admin/stats');
    return remote || null;
  }
};
