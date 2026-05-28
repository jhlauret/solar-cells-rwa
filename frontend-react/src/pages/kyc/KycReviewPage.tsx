import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { OnboardingLayout }  from '@/components/layout/OnboardingLayout/OnboardingLayout';
import { StepperVertical }   from '@/components/ui/StepperVertical';
import { Checkbox }          from '@/components/ui/Checkbox';
import { Button }            from '@/components/ui/Button';
import { Badge }             from '@/components/ui/Badge';
import { KycStatusCard }     from '@/features/kyc/components/KycStatusCard/KycStatusCard';
import { KYC_STEPS }        from '@/features/kyc/schemas/kyc.schema';
import { useKycStatus, useSubmitKyc } from '@/hooks/useKyc';
import { ApiError } from '@/lib/api-client';

export function KycReviewPage() {
  const navigate   = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const { data: kycStatus } = useKycStatus();
  const submitKyc           = useSubmitKyc();

  const caseUuid  = (kycStatus as Record<string, unknown>)?.uuid as string | undefined;
  const docCount  = Number((kycStatus as Record<string, unknown>)?.document_count ?? 0);
  const submitting = submitKyc.isPending;

  // Récapitulatif dynamique depuis le statut KYC
  const COMPLETED_STEPS = [
    { label: 'Informations personnelles', done: true,  detail: 'Renseigné'               },
    { label: 'Pièce d\'identité',         done: docCount >= 1, detail: docCount >= 1 ? 'Document envoyé'   : 'En attente' },
    { label: 'Selfie / Vérification',     done: docCount >= 2, detail: docCount >= 2 ? 'Vérification faciale' : 'En attente' },
    { label: 'Justificatif de domicile',  done: docCount >= 3, detail: docCount >= 3 ? 'Document envoyé'   : 'En attente' },
    { label: 'Source des fonds',          done: true,  detail: 'Déclaré' },
  ];

  const handleSubmit = async () => {
    if (!accepted) return;
    setError(null);
    try {
      if (caseUuid) {
        await submitKyc.mutateAsync(caseUuid);
      }
      navigate('/tableau-de-bord');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la soumission. Réessayez.');
    }
  };

  return (
    <OnboardingLayout
      sidebar={
        <StepperVertical title="Vérification KYC"
          steps={KYC_STEPS as unknown as Array<{ label: string }>}
          currentIndex={5}
        />
      }
      aside={<KycStatusCard status="in_progress" lastUpdated="aujourd'hui, 10:24" />}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-950">Revue et validation finale</h1>
        <p className="mt-1 text-sm text-ink-500 max-w-lg">
          Vérifiez les informations que vous avez fournies avant de soumettre votre dossier KYC.
        </p>
      </div>

      <div className="max-w-xl flex flex-col gap-5">
        {/* Récap des étapes */}
        <div className="rounded-2xl border border-ink-200 bg-white shadow-card overflow-hidden">
          <div className="bg-ink-50 px-5 py-3 border-b border-ink-100">
            <p className="text-xs font-bold text-ink-600 uppercase tracking-wide">Dossier KYC — Récapitulatif</p>
          </div>
          <ul className="divide-y divide-ink-100">
            {COMPLETED_STEPS.map(({ label, done, detail }) => (
              <li key={label} className="flex items-start gap-3 px-5 py-3.5">
                <div className="mt-0.5">
                  {done
                    ? <CheckCircle className="h-4.5 w-4.5 text-status-success" aria-hidden />
                    : <Clock className="h-4.5 w-4.5 text-ink-300" aria-hidden />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{label}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{detail}</p>
                </div>
                <Badge tone={done ? 'success' : 'muted'} className="text-[10px] shrink-0">
                  {done ? 'Complété' : 'Incomplet'}
                </Badge>
              </li>
            ))}
          </ul>
        </div>

        {/* Délai de traitement */}
        <div className="flex items-start gap-3 rounded-xl bg-status-info-bg border border-status-info/20 p-4">
          <Clock className="h-4 w-4 shrink-0 text-status-info mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-ink-900">Délai de traitement</p>
            <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">
              Votre dossier sera examiné par notre équipe compliance sous <strong>1 à 24h ouvrées</strong>.
              Vous serez notifié par e-mail dès validation de votre identité.
            </p>
          </div>
        </div>

        {/* Conditions */}
        <div className="rounded-xl border border-ink-200 p-4">
          <Checkbox
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            label={
              <span className="text-xs leading-relaxed">
                Je certifie que toutes les informations fournies sont exactes et conformes à la réalité.
                Je comprends que toute fausse déclaration peut entraîner la résiliation de mon compte
                et peut être passible de sanctions légales.
              </span>
            }
          />
        </div>

        {/* Erreur API */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-status-danger-bg border border-status-danger/30 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-status-danger shrink-0 mt-0.5" />
            <p className="text-sm text-status-danger">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} iconLeft={<span>←</span>}>Précédent</Button>
          <Button
            size="lg"
            disabled={!accepted || submitting}
            loading={submitting}
            onClick={handleSubmit}
          >
            Soumettre mon dossier KYC ✓
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
