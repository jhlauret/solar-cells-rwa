import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/common/ProtectedRoute';

// Layouts
import { PublicLayout }    from '@/components/layout/PublicLayout/PublicLayout';
import { AuthLayout }      from '@/components/layout/AuthLayout/AuthLayout';

// Public
import { LandingPage }     from '@/pages/LandingPage';

// Auth (pages publiques uniquement)
import { SignupPage }          from '@/pages/auth/SignupPage';
import { LoginPage }           from '@/pages/auth/LoginPage';
import { ForgotPasswordPage }  from '@/pages/auth/ForgotPasswordPage';
import { VerifyEmailPage }     from '@/pages/auth/VerifyEmailPage';

// KYC (authentifié, pas besoin de KYC validé)
import { KycPersonalInfoPage }   from '@/pages/kyc/KycPersonalInfoPage';
import { KycIdentityPage }       from '@/pages/kyc/KycIdentityPage';
import { KycSelfiePage }         from '@/pages/kyc/KycSelfiePage';
import { KycProofOfAddressPage } from '@/pages/kyc/KycProofOfAddressPage';
import { KycSourceOfFundsPage }  from '@/pages/kyc/KycSourceOfFundsPage';
import { KycReviewPage }         from '@/pages/kyc/KycReviewPage';

// Wallet (authentifié)
import { WalletTypeChoicePage }  from '@/pages/wallet/WalletTypeChoicePage';
import { WalletCreatedPage }     from '@/pages/wallet/WalletCreatedPage';

// Marketplace (public + authentifié)
import { MarketplacePage }     from '@/pages/marketplace/MarketplacePage';
import { AssetDetailPage }     from '@/pages/marketplace/AssetDetailPage';

// Invest tunnel (authentifié + KYC + wallet)
import { InvestAmountPage }       from '@/pages/invest/InvestAmountPage';
import { InvestPaymentPage }      from '@/pages/invest/InvestPaymentPage';
import { InvestSummaryPage }      from '@/pages/invest/InvestSummaryPage';
import { InvestConfirmationPage } from '@/pages/invest/InvestConfirmationPage';
import { InvestSuccessPage }      from '@/pages/invest/InvestSuccessPage';

// Dashboard (authentifié)
import { DashboardPage }   from '@/pages/dashboard/DashboardPage';
import { PortfolioPage }   from '@/pages/dashboard/PortfolioPage';
import { YieldPage }       from '@/pages/dashboard/YieldPage';
import { TransfersPage }   from '@/pages/dashboard/TransfersPage';

// Profile
import { ProfilePage }     from '@/pages/profile/ProfilePage';

// 404
import { NotFoundPage }    from '@/pages/NotFoundPage';

const router = createBrowserRouter([
  // ── Landing (public) ────────────────────────────────────────────────────────
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
    ],
  },

  // Auth publique (redirige si déjà connecté)
  {
    path: '/inscription',
    element: <PublicOnlyRoute><SignupPage /></PublicOnlyRoute>,
  },
  {
    path: '/connexion',
    element: <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>,
  },
  {
    path: '/mot-de-passe-oublie',
    element: <ForgotPasswordPage />,
  },
  // Vérification email (accessible authentifié ou non — compte pending)
  {
    path: '/verifier-email',
    element: <VerifyEmailPage />,
  },

  // ── Marketplace (public, enrichi si connecté) ────────────────────────────────
  {
    element: <AuthLayout />,
    children: [
      { path: '/actifs',          element: <MarketplacePage /> },
      { path: '/actifs/:assetId', element: <AssetDetailPage /> },
      { path: '/investir',        element: <MarketplacePage /> },
    ],
  },

  // ── KYC (authentifié) ────────────────────────────────────────────────────────
  {
    path: '/kyc/informations',
    element: <ProtectedRoute><KycPersonalInfoPage /></ProtectedRoute>,
  },
  {
    path: '/kyc/identite',
    element: <ProtectedRoute><KycIdentityPage /></ProtectedRoute>,
  },
  {
    path: '/kyc/selfie',
    element: <ProtectedRoute><KycSelfiePage /></ProtectedRoute>,
  },
  {
    path: '/kyc/justificatif-domicile',
    element: <ProtectedRoute><KycProofOfAddressPage /></ProtectedRoute>,
  },
  {
    path: '/kyc/source-des-fonds',
    element: <ProtectedRoute><KycSourceOfFundsPage /></ProtectedRoute>,
  },
  {
    path: '/kyc/revue',
    element: <ProtectedRoute><KycReviewPage /></ProtectedRoute>,
  },

  // ── Wallet (authentifié) ─────────────────────────────────────────────────────
  {
    path: '/wallet/creation',
    element: <ProtectedRoute><WalletTypeChoicePage /></ProtectedRoute>,
  },
  {
    path: '/wallet/cree',
    element: <ProtectedRoute><WalletCreatedPage /></ProtectedRoute>,
  },

  // ── Dashboard authentifié ────────────────────────────────────────────────────
  {
    element: (
      <ProtectedRoute requireKyc requireWallet>
        <AuthLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/tableau-de-bord', element: <DashboardPage />  },
      { path: '/portefeuille',    element: <PortfolioPage />  },
      { path: '/rendement',       element: <YieldPage />      },
      { path: '/transferts',      element: <TransfersPage />  },
      { path: '/profil',          element: <ProfilePage />    },
    ],
  },

  // ── Tunnel investissement (KYC + wallet requis) ───────────────────────────────
  {
    path: '/investir/:assetId/montant',
    element: <ProtectedRoute requireKyc requireWallet><InvestAmountPage /></ProtectedRoute>,
  },
  {
    path: '/investir/:assetId/paiement',
    element: <ProtectedRoute requireKyc requireWallet><InvestPaymentPage /></ProtectedRoute>,
  },
  {
    path: '/investir/:assetId/resume',
    element: <ProtectedRoute requireKyc requireWallet><InvestSummaryPage /></ProtectedRoute>,
  },
  {
    path: '/investir/:assetId/confirmation',
    element: <ProtectedRoute requireKyc requireWallet><InvestConfirmationPage /></ProtectedRoute>,
  },
  {
    path: '/investir/:assetId/succes',
    element: <ProtectedRoute><InvestSuccessPage /></ProtectedRoute>,
  },

  // ── 404 ─────────────────────────────────────────────────────────────────────
  { path: '*', element: <NotFoundPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
