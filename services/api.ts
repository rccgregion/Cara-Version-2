import { ChatMessage } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiryTime: number | null = null;

// Check if access token is expiring soon (within 2 minutes)
const isTokenExpiringSoon = (): boolean => {
  if (!tokenExpiryTime) return false;
  const now = Date.now();
  return now > tokenExpiryTime - 2 * 60 * 1000; // 2 minutes before expiry
};

// Set authentication tokens
export const setAuthTokens = (access: string, refresh: string, expiresIn: number = 900) => {
  accessToken = access;
  refreshToken = refresh;
  tokenExpiryTime = Date.now() + expiresIn * 1000;
  localStorage.setItem('cara_access_token', access);
  localStorage.setItem('cara_refresh_token', refresh);
  localStorage.setItem('cara_token_expiry', tokenExpiryTime.toString());
};

// Get current access token
export const getAccessToken = (): string | null => {
  return accessToken || localStorage.getItem('cara_access_token');
};

// Get refresh token
export const getRefreshToken = (): string | null => {
  return refreshToken || localStorage.getItem('cara_refresh_token');
};

// Clear authentication
export const clearAuth = () => {
  accessToken = null;
  refreshToken = null;
  tokenExpiryTime = null;
  localStorage.removeItem('cara_access_token');
  localStorage.removeItem('cara_refresh_token');
  localStorage.removeItem('cara_token_expiry');
};

// Refresh access token using refresh token
export const refreshAccessTokenFn = async (): Promise<boolean> => {
  try {
    const refreshTok = getRefreshToken();
    if (!refreshTok) {
      return false;
    }

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshTok }),
      credentials: 'include',
    });

    if (!response.ok) {
      clearAuth();
      return false;
    }

    const data = await response.json();
    accessToken = data.accessToken;
    tokenExpiryTime = Date.now() + data.expiresIn * 1000;
    localStorage.setItem('cara_access_token', data.accessToken);
    localStorage.setItem('cara_token_expiry', tokenExpiryTime.toString());
    return true;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return false;
  }
};

// API request helper with automatic token refresh
const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  // Check if token is expiring and refresh if needed
  if (isTokenExpiringSoon()) {
    const refreshed = await refreshAccessTokenFn();
    if (!refreshed) {
      throw new Error('Session expired. Please log in again.');
    }
  }

  const headers: any = {
    'Content-Type': 'application/json',
  };

  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Include cookies for refresh token
  });

  // Handle token expiry
  if (response.status === 401) {
    const refreshed = await refreshAccessTokenFn();
    if (refreshed) {
      // Retry the request with new token
      const newHeaders: any = { ...headers };
      const newToken = getAccessToken();
      if (newToken) {
        newHeaders.Authorization = `Bearer ${newToken}`;
      }
      
      const retryResponse = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: newHeaders,
        credentials: 'include',
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.json();
        throw new Error(error.error || 'API request failed');
      }

      return retryResponse.json();
    } else {
      clearAuth();
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
};

// ============ AUTH API ============

export const registerUser = async (
  email: string,
  name: string,
  role: string,
  password: string
) => {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, name, role, password }),
  });

  setAuthTokens(data.accessToken, data.refreshToken || '', data.expiresIn);
  return data.user;
};

export const loginUser = async (email: string, password: string) => {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setAuthTokens(data.accessToken, data.refreshToken || '', data.expiresIn);
  return data.user;
};

export const verifyToken = async () => {
  return apiRequest('/auth/verify');
};

export const logoutUser = async () => {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    clearAuth();
  }
};

// ============ GEMINI API ============

export interface ProcessPromptRequest {
  prompt: string;
  featureType?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface ProcessPromptResponse {
  response: string;
  tokensUsed: number;
  remainingQuota: number;
}

export const processPrompt = async (
  req: ProcessPromptRequest
): Promise<ProcessPromptResponse> => {
  return apiRequest('/gemini/process', {
    method: 'POST',
    body: JSON.stringify(req),
  });
};

export const generateFeedback = async (sessionId: string) => {
  return apiRequest('/gemini/generate-feedback', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
};

export const getQuotaStatus = async () => {
  return apiRequest('/gemini/quota');
};

// ============ SESSIONS API ============

export interface SessionData {
  featureType: string;
  title?: string;
  description?: string;
}

export const createSession = async (data: SessionData) => {
  return apiRequest('/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateSession = async (
  sessionId: string,
  updates: Partial<{
    durationSeconds: number;
    score: number;
    transcript: string;
    feedbackJson: any;
    clarity: number;
    pace: number;
    confidence: number;
    tone: number;
  }>
) => {
  return apiRequest(`/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
};

export const getUserSessions = async (
  featureType?: string,
  limit = 20,
  offset = 0
) => {
  const params = new URLSearchParams();
  if (featureType) params.append('featureType', featureType);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  return apiRequest(`/sessions?${params}`);
};

export const getSession = async (sessionId: string) => {
  return apiRequest(`/sessions/${sessionId}`);
};

// ============ ANALYTICS API ============

export interface AnalyticsEvent {
  eventType: string;
  metadata?: any;
}

export const trackEvent = async (event: AnalyticsEvent) => {
  return apiRequest('/analytics/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
};

export const getUserStats = async () => {
  return apiRequest('/analytics/stats');
};

export const getFeatureAdoption = async () => {
  return apiRequest('/analytics/adoption');
};
