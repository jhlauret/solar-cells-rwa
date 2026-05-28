import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Copy, Check, TrendingUp, ArrowRight, ShieldCheck, Wallet } from 'lucide-react';

import { SplitLayout } from '@/components/layout/SplitLayout/SplitLayout';
import { Stepper }     from '@/components/ui/Stepper';
import { Button }      from '@/components/ui/Button';
import { Spinner }     from '@/components/ui/Spinner';
import { cn }          from '@/lib/utils/cn';
import { useWallet }   from '@/hooks/useDashboard';

const ACTIONS = [
  { icon: TrendingUp, label: 'Acheter vos Solar Cells',   desc: 'Investissez dans des actifs solaires tokenisés.' },
  { icon: ArrowRight, label: 'Recevoir vos rendements',    desc: 'Vos revenus sont distribués directement.'       },
  { icon: ArrowRight, label: 'Transférer entre membres',   desc: 'Envoyez ou recevez des Solar Cells.'            },
  { icon: TrendingUp, label: 'Suivre votre performance',   desc: 'Consultez vos actifs et rendements.'            },
] as const;

const SECURITY_ITEMS = [
  'Chiffrement AES-256', 'Clés privées sécurisées (HSM)',
  'Conformité FINMA / AML', 'Audit continu & surveillance',
] as const;

const STEPS = [
  { label: 'Compte' }, { label: 'Vérification KYC' },
  { label: 'Création du compte' }, { label: 'Terminé' },
];

export function WalletCreatedPage() {
  const navigate            = useNavigate();
  const [copied, setCopied] = useState(false);
  const { data: wallet, isLoading } = useWallet();

  const walletAddress = wallet?.address ?? null;
  const walletType    = wallet?.wallet_type ?? 'custodial';
  const provider      = wallet?.provider ?? 'Fireblocks';

  const copyAddress = async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SplitLayout
      aside={
        <div className="relative flex flex-col justify-between h-full p-10 text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-ink-950 via-primary-950/70 to-ink-900" />
          <div aria-hidden className="absolute top-10 right-10 h-40 w-40 rounded-full bg-primary-600/10 blur-2xl" />
          <div aria-hidden className="absolute bottom-10 left-10 h-32 w-32 rounded-full bg-primary-400/10 blur-2xl" />

          <div className="relative z-10">
            <h2 className="text-3xl font-bold leading-tight text-white mb-3">
              Votre coffre numérique{' '}
              <span className="text-primary-400">est prêt !</span>
            </h2>
            <p className="text-sm text-ink-300 leading-relaxed mb-8">
              Nous avons créé votre compte sécurisé pour stocker
              vos Solar Cells et recevoir vos rendements.
            </p>

            {/* Features */}
            <ul className="flex flex-col gap-4">
              {[
                { icon: '🔐', label: 'Sécurisé',   desc: 'Vos actifs sont protégés avec un chiffrement de niveau bancaire.' },
                { icon: '⚡', label: 'Simple',      desc: 'Accédez à vos Solar Cells et rendements en quelques clics.' },
                { icon: '📋', label: 'Conforme',    desc: 'Conformité KYC/AML et réglementation suisse.' },
                { icon: '👤', label: 'Contrôlé',    desc: 'Vous gardez le contrôle de vos investissements.' },
              ].map(({ icon, label, desc }) => (
                <li key={label} className="flex items-start gap-3">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-ink-400">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      }
    >
      {/* Header stepper */}
      <div className="border-b border-ink-100 px-8 py-4">
        <Stepper steps={STEPS} currentIndex={2} />
      </div>

      {/* Contenu */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-10">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-ink-950 mb-6">
            Votre compte <span className="text-primary-700">SolarCells</span>
          </h1>

          {/* Succès */}
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-status-success/30 bg-status-success-bg/30 p-4">
            <CheckCircle className="h-5 w-5 shrink-0 text-status-success mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-ink-900">Compte créé avec succès !</p>
              <p className="text-xs text-ink-500 mt-0.5">
                Votre coffre numérique est actif et votre adresse unique a été générée.
              </p>
            </div>
          </div>

          {/* Adresse wallet */}
          <div className="mb-6 rounded-xl border border-ink-200 bg-ink-50 p-4">
            <p className="mb-2 text-xs font-semibold text-ink-500 uppercase tracking-wide">
              Adresse de votre compte — {provider} · {walletType}
            </p>
            {isLoading ? (
              <div className="flex items-center gap-2 py-1"><Spinner size="sm" /><span className="text-xs text-ink-400">Chargement…</span></div>
            ) : walletAddress ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate text-sm font-mono text-ink-800">
                {walletAddress}
              </code>
              <button
                onClick={copyAddress}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all',
                  copied
                    ? 'border-status-success bg-status-success-bg text-status-success'
                    : 'border-ink-200 bg-white text-ink-500 hover:border-ink-300 hover:text-ink-800',
                )}
                aria-label="Copier l'adresse"
              >
                {copied
                  ? <Check className="h-4 w-4" aria-hidden />
                  : <Copy className="h-4 w-4" aria-hidden />
                }
              </button>
            </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-ink-400">
                <Wallet className="h-4 w-4" />
                Adresse en cours d'attribution par {provider}…
              </div>
            )}
            <div className="mt-3 flex items-center gap-4 text-xs text-ink-500">
              <span>Réseau : <strong className="text-ink-700">Tempo (Stripe)</strong></span>
              <span>Type : <strong className="text-ink-700 capitalize">{walletType}</strong></span>
            </div>
          </div>

          {/* Actions disponibles */}
          <p className="mb-3 text-sm font-semibold text-ink-800">Ce que vous pouvez faire maintenant</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ACTIONS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-xl border border-ink-200 bg-white p-3 text-center hover:border-primary-200 hover:bg-primary-50/30 transition-all cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100">
                  <Icon className="h-4 w-4 text-primary-600" aria-hidden />
                </div>
                <p className="text-xs font-semibold text-ink-800 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Sécurité */}
          <div className="mb-6 rounded-xl border border-ink-200 bg-ink-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-primary-600" aria-hidden />
              <p className="text-xs font-semibold text-ink-700">Sécurité & confiance</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {SECURITY_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-[10px] text-ink-500">
                  <CheckCircle className="h-3 w-3 text-status-success shrink-0" aria-hidden />
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-ink-400">
              Vos actifs sont stockés dans un environnement sécurisé et réglementé en Suisse.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Button fullWidth size="lg" onClick={() => navigate('/portefeuille')}>
              Continuer vers mon portefeuille →
            </Button>
            <Button variant="ghost" fullWidth onClick={() => navigate('/tableau-de-bord')}>
              ← Retour au tableau de bord
            </Button>
          </div>
        </div>
      </div>
    </SplitLayout>
  );
}
