// API Service for WildAtlas client with Firebase Authentication ID Token Interceptor
import { auth } from '../firebase';

const API_BASE = 'http://localhost:5000/api';

let logoutCallback: (() => void) | null = null;
let unverifiedCallback: (() => void) | null = null;

export const setLogoutCallback = (cb: () => void) => {
  logoutCallback = cb;
};

export const setUnverifiedCallback = (cb: () => void) => {
  unverifiedCallback = cb;
};

const triggerLogout = () => {
  if (logoutCallback) {
    logoutCallback();
  } else {
    window.location.href = '/auth';
  }
};

const triggerUnverifiedRedirect = () => {
  if (unverifiedCallback) {
    unverifiedCallback();
  } else if (!window.location.pathname.includes('/verify-email') && !window.location.pathname.includes('/auth')) {
    window.location.href = '/verify-email';
  }
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    if (auth.currentUser) {
      // Automatically gets a fresh ID token (refreshed by Firebase if expired)
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.warn('[API] Could not retrieve Firebase ID token:', err);
  }

  return headers;
};

const request = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const url = `${API_BASE}${endpoint}`;
  const authHeaders = await getAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });

  // Handle 401 Unauthorized (Invalid or Revoked Token)
  if (response.status === 401 && !endpoint.includes('/auth/validate-email')) {
    console.warn('[API] 401 Unauthorized from backend. Redirecting to auth.');
    triggerLogout();
    throw new Error("Session expired or unauthorized. Please log in again.");
  }

  // Handle 403 Forbidden with EMAIL_NOT_VERIFIED code
  if (response.status === 403) {
    const errorData = await response.clone().json().catch(() => ({}));
    if (errorData.code === 'EMAIL_NOT_VERIFIED') {
      console.warn('[API] 403 Email not verified. Redirecting to verification screen.');
      triggerUnverifiedRedirect();
      throw new Error("Email verification is required to perform this action.");
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const api = {
  // Check backend server status
  getStatus: () => request('/status'),

  // Email Domain & Format Validation (Pre-registration check)
  validateEmailDomain: (email: string) =>
    request('/auth/validate-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Forest endpoints
  getForests: (continent?: string) => request(`/forests${continent ? '?continent=' + encodeURIComponent(continent) : ''}`),
  getForestById: (id: number | string) => request(`/forests/${id}`),
  searchForests: (query: string) => request(`/forests/search?q=${encodeURIComponent(query)}`),
  getForestWildlife: (id: number | string, group?: string) => request(`/forests/${id}/wildlife${group ? '?group=' + encodeURIComponent(group) : ''}`),
  getForestSpecies: (id: number | string, group?: string) => request(`/forests/${id}/species${group ? '?group=' + encodeURIComponent(group) : ''}`),
  
  // Real Road Routing (OSRM)
  getRoute: (startLat: number, startLng: number, endLat: number, endLng: number, profile: string = 'driving') =>
    request(`/routes?startLat=${startLat}&startLng=${startLng}&endLat=${endLat}&endLng=${endLng}&profile=${profile}`),

  // Zoo endpoints (Local SQLite)
  getZoos: (continent?: string) => request(`/zoos${continent ? '?continent=' + encodeURIComponent(continent) : ''}`),
  getZooById: (id: number | string) => request(`/zoos/${id}`),
  searchZoos: (query: string) => request(`/zoos/search?q=${encodeURIComponent(query)}`),
  getZooWildlife: (id: number | string, group?: string) => request(`/zoos/${id}/wildlife${group ? '?group=' + encodeURIComponent(group) : ''}`),
  getZooSpecies: (id: number | string, group?: string) => request(`/zoos/${id}/species${group ? '?group=' + encodeURIComponent(group) : ''}`),

  // Unified Global Search
  searchGlobal: (query: string) => request(`/search/global?q=${encodeURIComponent(query)}`),
  
  // Wildlife & Species endpoints (Local SQLite)
  getWildlifeById: (id: number | string) => request(`/wildlife/${id}`),
  getSpecies: (group?: string) => request(`/species${group ? '?group=' + encodeURIComponent(group) : ''}`),
  getSpeciesById: (id: number | string) => request(`/species/${id}`),
  getSpeciesOccurrences: (id: number | string, limit?: number) => request(`/species/${id}/occurrences${limit ? '?limit=' + limit : ''}`),
  getValidationReport: () => request('/validation-report'),

  // User auth & profile endpoints (Server Firestore Profile Sync)
  getProfile: () => request('/auth/me'),
  updateProfile: (profileData: { name: string; avatar: string | null }) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),
  deleteAccount: () =>
    request('/auth/account', {
      method: 'DELETE',
    }),
  getUserDashboard: () => request('/user/dashboard'),

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

  // Sightings
  getSightings: () => request('/sightings'),
  getUserSightings: () => request('/user/sightings'),
  submitSighting: (sightingData: any) =>
    request('/user/sightings', {
      method: 'POST',
      body: JSON.stringify(sightingData),
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
  addWildlife: (wildlife: any) =>
    request('/admin/wildlife', {
      method: 'POST',
      body: JSON.stringify(wildlife),
    }),
  updateWildlife: (id: number | string, wildlife: any) =>
    request(`/admin/wildlife/${id}`, {
      method: 'PUT',
      body: JSON.stringify(wildlife),
    }),
  deleteWildlife: (id: number | string) =>
    request(`/admin/wildlife/${id}`, {
      method: 'DELETE',
    }),
  getAdminDashboard: () => request('/admin/dashboard'),
  getAllUsers: () => request('/admin/users'),
  getUsers: () => request('/admin/users'),
  getChats: () => request('/admin/chats'),
  getAdminSightings: () => request('/sightings'),
  getGbifStats: () => request('/gbif/stats'),
  getGbifOccurrences: (params?: any) => request(`/gbif/occurrences${params ? '?category=' + (params.category || '') : ''}`),
  verifySighting: (id: number | string, status: 'verified' | 'flagged' | 'pending') =>
    request(`/admin/sightings/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  batchVerifySightings: (ids: (number | string)[], status: 'verified' | 'flagged') =>
    request('/admin/sightings/batch-verify', {
      method: 'PATCH',
      body: JSON.stringify({ ids, status }),
    }),
  importGbifData: (params: { category?: string; limit?: number; offset?: number; requireImage?: boolean }) =>
    request('/gbif/import', {
      method: 'POST',
      body: JSON.stringify(params),
    })
};

export default api;
