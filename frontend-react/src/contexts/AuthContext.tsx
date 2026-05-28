import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { setAccessToken, ApiError } from '@/lib/api-client';
import { queryClient } from '@/lib/query-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  partnerUuid:   string;
  email:         string;
  kycStatus?:    string;
  walletState?:  string;
  accountState?: string;   // pending | active | suspended | closed
}

interface AuthContextValue {
  user:            AuthUser | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  login:           (email: string, password: string) => Promise<void>;
  register:        (data: RegisterInput) => Promise<void>;
  logout:          () => Promise<void>;
  refreshUser:     () => Promise<void>;
}

export interface RegisterInput {
  name:            string;
  email:           string;
  password:        string;
  countryCode:     string;
  investorType?:   string;
  termsAccepted:   true;
  marketingOptin?: boolean;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);
  const navigate               = useNavigate();

  // Récupère l'utilisateur courant depuis le backend (appelé au boot + après refresh)
  const fetchMe = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const data = await apiClient.get<AuthUser & { accountState?: string }>('/auth/me');
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  }, []);

  // Enrichit le user avec son statut KYC et wallet
  const fetchUserDetails = useCallback(async (base: AuthUser): Promise<AuthUser> => {
    try {
      const [kycStatus, walletInfo] = await Promise.allSettled([
        apiClient.get<{ state: string }>('/kyc/status'),
        apiClient.get<{ state: string } | null>('/wallet'),
      ]);
      return {
        ...base,
        kycStatus:   kycStatus.status  === 'fulfilled' ? kycStatus.value?.state  : undefined,
        walletState: walletInfo.status === 'fulfilled' ? walletInfo.value?.state : undefined,
      };
    } catch {
      return base;
    }
  }, []);

  // Rafraîchit l'utilisateur (appelé depuis les pages après changement de KYC/wallet)
  const refreshUser = useCallback(async () => {
    const base = await fetchMe();
    if (base) {
      const detailed = await fetchUserDetails(base);
      setUser(detailed);
    }
  }, [fetchMe, fetchUserDetails]);

  // Bootstrap : essaie de restaurer la session via le cookie de refresh
  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        // Tente un refresh pour obtenir un nouveau access_token
        await apiClient.post('/auth/refresh');
        const base = await fetchMe();
        if (base) {
          const detailed = await fetchUserDetails(base);
          setUser(detailed);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [fetchMe, fetchUserDetails]);

  // ── Méthodes exposées ────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiClient.post<{ partnerUuid: string; email: string }>(
      '/auth/login', { email, password },
    );
    const base     = { partnerUuid: result.partnerUuid, email: result.email };
    const detailed = await fetchUserDetails(base);
    setUser(detailed);
    // Si le compte n'est pas encore vérifié → rediriger vers la page OTP
    if ((detailed as Record<string, unknown>).accountState === 'pending') {
      navigate('/verifier-email');
    }
  }, [fetchUserDetails, navigate]);

  const register = useCallback(async (data: RegisterInput) => {
    const result = await apiClient.post<{ partnerUuid: string; email: string }>(
      '/auth/register', data,
    );
    const base = { partnerUuid: result.partnerUuid, email: result.email };
    setUser(base);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // silent — logout même en cas d'erreur réseau
    }
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
    navigate('/connexion');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>');
  return ctx;
}
