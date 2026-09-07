// API Service for WildAtlas client with Production-Grade Authentication Interceptor

const API_BASE = 'http://localhost:5000/api';

let refreshPromise: Promise<string> | null = null;
let logoutCallback: (() => void) | null = null;

export const setLogoutCallback = (cb: () => void) => {
  logoutCallback = cb;
};

const triggerLogout = () => {
  localStorage.removeItem('wildatlas_token');
  localStorage.removeItem('wildatlas_refresh_token');
  if (logoutCallback) {
    logoutCallback();
  } else {
    window.location.href = '/auth';
  }
};

const getHeaders = () => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('wildatlas_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Auto-refresh token function (prevents concurrent refreshes)
const performTokenRefresh = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('wildatlas_refresh_token');
  if (!refreshToken) {
    throw new Error("No refresh token available.");
  }

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Refresh token expired or invalid.");
  }

  const data = await response.json();
  if (!data.accessToken) {
    throw new Error("No access token returned.");
  }

  localStorage.setItem('wildatlas_token', data.accessToken);
  return data.accessToken;
};

const request = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const url = `${API_BASE}${endpoint}`;
  
  let response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  // Handle 401 Unauthorized / Expired Access Token
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/register')) {
    try {
      // Deduplicate concurrent refresh requests
      if (!refreshPromise) {
        refreshPromise = performTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      
      const newAccessToken = await refreshPromise;

      // Retry the original request with the new access token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newAccessToken}`,
        },
      });
    } catch (refreshError) {
      console.error("Token refresh failed. Logging out user.", refreshError);
      triggerLogout();
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const api = {
  // Check backend server status
  getStatus: () => request('/status'),

  // Forest endpoints
  getForests: () => request('/forests'),
  getForestById: (id: number | string) => request(`/forests/${id}`),
  searchForests: (query: string) => request(`/forests/search?q=${encodeURIComponent(query)}`),
  getForestWildlife: (id: number | string) => request(`/forests/${id}/wildlife`),
  
  // Wildlife endpoints
  getWildlifeById: (id: number | string) => request(`/wildlife/${id}`),

  // User auth & profile endpoints
  login: (credentials: any) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  register: (userDetails: any) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userDetails),
    }),
  logoutApi: () =>
    request('/auth/logout', {
      method: 'POST',
    }),
  getProfile: () => request('/auth/me'),
  updateProfile: (profileData: { name: string; avatar: string | null }) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),
  changePassword: (passwordData: any) =>
    request('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify(passwordData),
    }),
  deleteAccount: () =>
    request('/auth/account', {
      method: 'DELETE',
    }),

  // AI Chat endpoints
  sendChatMessage: (prompt: string, style?: string, history?: { prompt: string; answer: string }[]) => 
    request('/user/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, style, history }),
    }),
  getChatHistory: () => request('/user/chat/history'),
  updateChatTitle: (id: string, title: string) =>
    request(`/user/chat/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),
  deleteChat: (id: string) =>
    request(`/user/chat/${id}`, {
      method: 'DELETE',
    }),
  identifySpecies: (image: string, mimeType: string) => 
    request('/user/identify', {
      method: 'POST',
      body: JSON.stringify({ image, mimeType }),
    }),
  getForestOverview: (name: string, description: string) =>
    request('/user/ai/forest-overview', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
  getSpeciesSummary: (speciesName: string) =>
    request('/user/ai/species-summary', {
      method: 'POST',
      body: JSON.stringify({ speciesName }),
    }),
  getSearchIntent: (query: string) =>
    request('/user/ai/search-intent', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  // Zoos
  getZoos: () => request('/zoos'),

  // Sightings
  getSightings: () => request('/sightings'),
  getUserSightings: () => request('/user/sightings'),
  submitSighting: (sightingData: any) =>
    request('/user/sightings', {
      method: 'POST',
      body: JSON.stringify(sightingData),
    }),

  // Routing
  calculateRoute: (coords: { startLat: number; startLng: number; destLat: number; destLng: number }) =>
    request('/user/route', {
      method: 'POST',
      body: JSON.stringify(coords),
    }),

  // Admin endpoints
  addForest: (forest: any) => 
    request('/admin/forests', {
      method: 'POST',
      body: JSON.stringify(forest),
    }),
  updateForest: (id: number | string, forest: any) =>
    request(`/admin/forests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(forest),
    }),
  deleteForest: (id: number | string) => 
    request(`/admin/forests/${id}`, {
      method: 'DELETE',
    }),
  addWildlife: (animal: any) => 
    request('/admin/wildlife', {
      method: 'POST',
      body: JSON.stringify(animal),
    }),
  updateWildlife: (id: number | string, animal: any) =>
    request(`/admin/wildlife/${id}`, {
      method: 'PUT',
      body: JSON.stringify(animal),
    }),
  deleteWildlife: (id: number | string) => 
    request(`/admin/wildlife/${id}`, {
      method: 'DELETE',
    }),
  getUsers: () => request('/admin/users'),
  getChats: () => request('/admin/chats'),
  getAnalytics: () => request('/admin/analytics'),

  // Dashboards
  getUserDashboard: () => request('/user/dashboard'),
  getAdminDashboard: () => request('/admin/dashboard'),

  // Admin Zoos & Sightings
  addZoo: (zoo: any) =>
    request('/admin/zoos', {
      method: 'POST',
      body: JSON.stringify(zoo),
    }),
  deleteZoo: (id: number | string) =>
    request(`/admin/zoos/${id}`, {
      method: 'DELETE',
    }),
  getAdminSightings: () => request('/admin/sightings'),
  verifySighting: (id: number | string, status: 'verified' | 'flagged') =>
    request(`/admin/sightings/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  batchVerifySightings: (ids: (number | string)[], status: 'verified' | 'flagged') =>
    request('/admin/sightings/batch-verify', {
      method: 'POST',
      body: JSON.stringify({ ids, status }),
    }),
};


