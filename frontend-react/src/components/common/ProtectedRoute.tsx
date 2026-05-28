import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Si true, redirige si KYC non validé */
  requireKyc?: boolean;
  /** Si true, redirige si wallet non actif */
  requireWallet?: boolean;
}

export function ProtectedRoute({
  children,
  requireKyc    = false,
  requireWallet = false,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Bootstrap en cours — afficher un spinner
  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-50">
        <Spinner size="lg" />
      </div>
    );
  }

  // Non authentifié → page de connexion
  if (!isAuthenticated) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  // Compte non vérifié → page de vérification email
  if (user?.accountState === 'pending') {
    return <Navigate to="/verifier-email" replace />;
  }

  // KYC requis mais non validé → tunnel KYC
  if (requireKyc && user?.kycStatus !== 'validated') {
    return <Navigate to="/kyc/informations" state={{ from: location }} replace />;
  }

  // Wallet requis mais absent/inactif → création wallet
  if (requireWallet && user?.walletState !== 'active') {
    return <Navigate to="/wallet/creation" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Redirige les utilisateurs déjà connectés (login/register)
 * vers le dashboard.
 */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/tableau-de-bord" replace />;
  }

  return <>{children}</>;
}
