import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { InvestLayout }  from '@/components/layout/InvestLayout/InvestLayout';
import { Spinner }       from '@/components/ui/Spinner';
import { Button }        from '@/components/ui/Button';
import apiClient         from '@/lib/api-client';

// Statuts terminaux côté Odoo
const TERMINAL_OK     = new Set(['settled']);
const TERMINAL_FAILED = new Set(['cancelled', 'refunded']);

const STEPS = [
  'Paiement en cours de traitement',
  'Conversion & contrôle de conformité',
  'Attribution des Solar Cells',
  'Mise à jour du portefeuille',
] as const;

type StepStatus = 'pending' | 'active' | 'done' | 'error';

export function InvestConfirmationPage() {
  const { assetId }   = useParams<{ assetId: string }>();
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const orderUuid     = params.get('order') ?? '';

  const [current, setCurrent]    = useState(0);
  const [statuses, setStatuses]  = useState<StepStatus[]>(
    STEPS.map((_, i) => (i === 0 ? 'active' : 'pending')),
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!orderUuid) return;

    let cancelled = false;
    let step      = 0;

    // Avance l'animation UI indépendamment du polling
    const advanceStep = () => {
      if (cancelled) return;
      if (step < STEPS.length - 1) {
        setStatuses(prev => prev.map((s, i) =>
          i === step   ? 'done'   :
          i === step+1 ? 'active' : s,
        ));
        step++;
      }
    };

    const stepTimer = setInterval(advanceStep, 1800);

    // Polling de l'état de l'ordre toutes les 3 secondes
    const poll = async () => {
      if (cancelled) return;
      try {
        const order = await apiClient.get<{ state: string }>(
          `/investments/${orderUuid}`,
        );
        if (TERMINAL_OK.has(order.state)) {
          clearInterval(stepTimer);
          // Marquer toutes les étapes comme done
          setStatuses(STEPS.map(() => 'done'));
          setCurrent(STEPS.length);
          setTimeout(() => {
            if (!cancelled) navigate(`/investir/${assetId}/succes?order=${orderUuid}`);
          }, 800);
        } else if (TERMINAL_FAILED.has(order.state)) {
          clearInterval(stepTimer);
          setFailed(true);
          setStatuses(prev => prev.map((s, i) =>
            s === 'active' ? 'error' : s,
          ));
        }
      } catch {
        // En cas d'erreur réseau, on continue le polling
      }
    };

    const pollTimer = setInterval(poll, 3000);
    poll(); // premier appel immédiat

    return () => {
      cancelled = true;
      clearInterval(stepTimer);
      clearInterval(pollTimer);
    };
  }, [orderUuid, assetId, navigate]);

  return (
    <InvestLayout currentStep={3}>
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-ink-200 bg-white p-8 shadow-card text-center">

          {/* Icône animée */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
            {failed ? (
              <AlertCircle className="h-8 w-8 text-status-danger" />
            ) : current >= STEPS.length ? (
              <CheckCircle className="h-8 w-8 text-status-success" />
            ) : (
              <Spinner size="lg" />
            )}
          </div>

          <h1 className="text-xl font-bold text-ink-950 mb-2">
            {failed
              ? 'Paiement non abouti'
              : current >= STEPS.length
              ? 'Investissement confirmé !'
              : 'Traitement en cours…'}
          </h1>
          <p className="text-sm text-ink-500 mb-8">
            {failed
              ? 'Votre commande n\'a pas pu être finalisée. Aucun montant n\'a été débité.'
              : 'Votre investissement est en cours de validation. Cela prend généralement moins d\'une minute.'}
          </p>

          {/* Étapes */}
          <div className="text-left space-y-3 mb-8">
            {STEPS.map((label, i) => {
              const status = statuses[i];
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 border-ink-200">
                    {status === 'done'   && <CheckCircle className="h-4 w-4 text-status-success" />}
                    {status === 'active' && <Spinner size="sm" />}
                    {status === 'error'  && <AlertCircle className="h-4 w-4 text-status-danger" />}
                    {status === 'pending'&& <div className="h-2 w-2 rounded-full bg-ink-200" />}
                  </div>
                  <span className={`text-sm transition-colors ${
                    status === 'done'    ? 'font-medium text-ink-900' :
                    status === 'active'  ? 'font-medium text-primary-700 animate-pulse' :
                    status === 'error'   ? 'text-status-danger' :
                    'text-ink-400'
                  }`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {failed && (
            <div className="space-y-3">
              <Button fullWidth onClick={() => navigate(-1)}>
                Réessayer
              </Button>
              <Button fullWidth variant="ghost" onClick={() => navigate('/tableau-de-bord')}>
                Retour au tableau de bord
              </Button>
            </div>
          )}

          {!failed && current < STEPS.length && (
            <p className="text-[11px] text-ink-400">
              Ne fermez pas cette page. Vous serez redirigé automatiquement.
            </p>
          )}
        </div>
      </div>
    </InvestLayout>
  );
}
