import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data:    T;
}
export interface ApiErrorBody {
  success: false;
  error:   string;
  code?:   string;
  details?: { field: string; message: string }[];
}
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiErrorBody;

export class ApiError extends Error {
  constructor(
    message: string,
    public code?:    string,
    public status?:  number,
    public details?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function throwIfError<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new ApiError(response.error, response.code, undefined, response.details);
  }
  return response.data;
}

// ─── Gestion du token en mémoire (httpOnly cookie géré par le browser) ────────

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

// ─── Création de l'instance axios ─────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL:         BASE_URL,
  withCredentials: true,           // pour les httpOnly cookies (refresh_token)
  timeout:         15_000,
  headers:         { 'Content-Type': 'application/json' },
});

// ── Intercepteur requête : injecte le token d'accès ───────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Intercepteur réponse : refresh transparent sur 401 ───────────────────────
api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // 401 + pas déjà retryé + pas la route refresh elle-même
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      // Un seul appel de refresh en parallèle
      if (!refreshPromise) {
        refreshPromise = api
          .post<ApiResponse<{ refreshed: boolean }>>('/auth/refresh')
          .then(() => {
            // Le nouveau access_token sera récupéré via /auth/me par AuthContext
            return null;
          })
          .catch(() => {
            accessToken = null;
            return null;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      await refreshPromise;

      // Retry la requête originale
      return api(originalRequest);
    }

    // Transformer en ApiError
    const data = error.response?.data;
    throw new ApiError(
      data?.error ?? error.message,
      data?.code,
      error.response?.status,
      data?.details,
    );
  },
);

// ─── Méthodes helpers typées ─────────────────────────────────────────────────

export const apiClient = {
  // GET
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const res = await api.get<ApiResponse<T>>(url, { params });
    return throwIfError(res.data);
  },

  // POST
  async post<T>(url: string, data?: unknown): Promise<T> {
    const res = await api.post<ApiResponse<T>>(url, data);
    return throwIfError(res.data);
  },

  // PUT
  async put<T>(url: string, data?: unknown): Promise<T> {
    const res = await api.put<ApiResponse<T>>(url, data);
    return throwIfError(res.data);
  },

  // PATCH
  async patch<T>(url: string, data?: unknown): Promise<T> {
    const res = await api.patch<ApiResponse<T>>(url, data);
    return throwIfError(res.data);
  },

  // DELETE
  async delete<T>(url: string): Promise<T> {
    const res = await api.delete<ApiResponse<T>>(url);
    return throwIfError(res.data);
  },

  // Upload (multipart/form-data)
  async upload<T>(url: string, formData: FormData): Promise<T> {
    const res = await api.post<ApiResponse<T>>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return throwIfError(res.data);
  },
};

export default apiClient;
