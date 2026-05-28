import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, TrendingUp, Euro, ArrowRight, Lock, AlertCircle } from 'lucide-react';

import { OnboardingLayout }  from '@/components/layout/OnboardingLayout/OnboardingLayout';
import { StepperVertical }   from '@/components/ui/StepperVertical';
import { RadioCard }         from '@/components/ui/RadioCard';
import { Button }            from '@/components/ui/Button';
import { KYC_STEPS }        from '@/features/kyc/schemas/kyc.schema';
import { useCreateWallet }  from '@/hooks/useDashboard';
import { useAuth }          from '@/contexts/AuthContext';
import { ApiError }         from '@/lib/api-client';

// Étapes wallet
const WALLET_STEPS = [
  ...KYC_STEPS.slice(0, 4),
  { label: 'Création du wallet' },
  { label: 'Source des fonds'   },
  { label: 'Revue et validation'},
] as const;

const WALLET_FEATURES = [
  { icon: TrendingUp, label: 'Acheter des Solar Cells',        desc: 'Investissez dans des actifs solaires tokenisés dès 1 €.' },
  { icon: TrendingUp, label: 'Suivre vos investissements',     desc: 'Consultez vos actifs, rendements et performances en temps réel.' },
  { icon: Euro,       label: 'Recevoir vos rendements',        desc: 'Vos revenus sont distribués directement dans votre compte.' },
  { icon: ArrowRight, label: 'Transférer en toute sécurité',   desc: 'Envoyez ou recevez des Solar Cells entre utilisateurs vérifiés.' },
] as const;

const TRUST_ITEMS = [
  'Chiffrement AES-256',
  'Clés privées sécurisées (HSM)',
  'Conformité FINMA / AML',
  'Audit continu & surveillance',
] as const;

export function WalletTypeChoicePage() {
  const navigate  = useNavigate();
  const { refreshUser } = useAuth();
  const [type, setType] = useState<'custodial' | 'self_custodial'>('custodial');
  const [error, setError] = useState<string | null>(null);

  const createWallet = useCreateWallet();
  const creating     = createWallet.isPending;

  const handleCreate = async () => {
    setError(null);
    try {
      // Génère un vault ID temporaire — en production, fourni par Fireblocks
      const providerVaultId = `vault-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await createWallet.mutateAsync({
        providerVaultId,
        walletType: type,
        network:    'tempo',
      });
      // Rafraîchir l'état auth (walletState = 'active')
      await refreshUser();
      navigate('/wallet/cree');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la création du wallet. Réessayez.');
    }
  };

  return (
    <OnboardingLayout
      sidebar={
        <StepperVertical
          title="Vérification KYC"
          steps={WALLET_STEPS as unknown as Array<{ label: string }>}
          currentIndex={4}
        />
      }
      aside={
        <>
          <div className="rounded-xl border border-ink-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-primary-600" aria-hidden />
              <p className="text-sm font-semibold text-ink-900">Sécurité garantie</p>
            </div>
            <p className="text-xs text-ink-500 mb-3 leading-relaxed">
              Vos actifs sont protégés selon les plus hauts standards de sécurité.
            </p>
            <button className="text-xs font-semibold text-primary-700 hover:text-primary-800">
              En savoir plus →
            </button>
          </div>

          <div className="rounded-xl border border-ink-200 bg-white p-4">
            <p className="text-sm font-semibold text-ink-900 mb-3">
              Ce que vous pourrez faire avec votre compte
            </p>
            <ul className="flex flex-col gap-3">
              {WALLET_FEATURES.map(({ icon: Icon, label, desc }) => (
                <li key={label} className="flex items-start gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 mt-0.5 text-primary-500" aria-hidden />
                  <div>
                    <p className="text-xs font-semibold text-ink-800">{label}</p>
                    <p className="text-xs text-ink-400 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-ink-50 p-4 border border-ink-200">
            <div className="flex flex-wrap gap-2">
              {TRUST_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-[10px] text-ink-500 font-medium">
                  <ShieldCheck className="h-3 w-3 text-primary-500" aria-hidden />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </>
      }
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-950">Création de votre compte</h1>
        <p className="mt-1 text-sm text-ink-500 max-w-lg">
          Votre compte sécurisé va être créé automatiquement. Il vous permettra
          d'acheter, détenir et transférer vos Solar Cells en toute sécurité.
        </p>
      </div>

      <div className="max-w-lg">
        {/* Info coffre */}
        <div className="mb-6 rounded-xl border border-ink-200 bg-gradient-to-br from-primary-50 to-ink-50 p-5 flex items-start gap-4">
          <div className="text-4xl">🔐</div>
          <div>
            <p className="font-semibold text-ink-900 mb-2">Votre coffre numérique sécurisé</p>
            <ul className="flex flex-col gap-1.5">
              {[
                'Création automatique et sécurisée',
                'Conformité KYC/AML et réglementation',
                'Vos actifs sont protégés par un système de garde institutionnelle',
                'Vous gardez le contrôle de vos investissements',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-ink-700">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary-600" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Choix de type */}
        <fieldset className="mb-6">
          <legend className="text-sm font-semibold text-ink-900 mb-3">Type de compte</legend>
          <div className="flex flex-col gap-3">
            <RadioCard
              name="walletType"
              value="custodial"
              checked={type === 'custodial'}
              onChange={() => setType('custodial')}
              label="Compte custodial (recommandé)"
              description="Géré pour vous par Solar Cells. Idéal pour les investisseurs souhaitant une expérience simple et sécurisée."
              badge="Recommandé"
              icon={<ShieldCheck className="h-5 w-5" />}
            />
            <RadioCard
              name="walletType"
              value="self_custodial"
              checked={type === 'self_custodial'}
              onChange={() => setType('self_custodial')}
              label="Compte non-custodial"
              description="Vous gérez vous-même vos clés privées. Option avancée pour utilisateurs expérimentés."
              icon={<User className="h-5 w-5" />}
            />
          </div>
        </fieldset>

        {/* Info clés */}
        <div className="mb-6 flex items-start gap-2 rounded-lg bg-ink-50 p-3">
          <Lock className="h-4 w-4 shrink-0 text-ink-500 mt-0.5" aria-hidden />
          <p className="text-xs text-ink-500">
            Vos clés privées sont stockées de manière sécurisée dans une infrastructure certifiée.
            Solar Cells n'a jamais accès à vos fonds.
          </p>
        </div>

        {/* Navigation */}
        {/* Erreur API */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-status-danger-bg border border-status-danger/30 px-4 py-3 mb-2">
            <AlertCircle className="h-4 w-4 text-status-danger shrink-0 mt-0.5" />
            <p className="text-sm text-status-danger">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} iconLeft={<span>←</span>}>
            Précédent
          </Button>
          <Button loading={creating} onClick={handleCreate} disabled={creating}>
            Créer mon compte →
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
