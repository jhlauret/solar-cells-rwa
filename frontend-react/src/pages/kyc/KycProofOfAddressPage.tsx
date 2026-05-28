import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

import { OnboardingLayout }  from '@/components/layout/OnboardingLayout/OnboardingLayout';
import { StepperVertical }   from '@/components/ui/StepperVertical';
import { FileDropzone }      from '@/components/ui/FileDropzone';
import { Button }            from '@/components/ui/Button';
import { KycStatusCard }     from '@/features/kyc/components/KycStatusCard/KycStatusCard';
import { KYC_STEPS }        from '@/features/kyc/schemas/kyc.schema';
import { useKycStatus, useStartKyc, useUploadDocument } from '@/hooks/useKyc';

const ACCEPTED_DOCS = [
  'Facture d\'électricité, de gaz ou d\'eau',
  'Quittance de loyer',
  'Relevé bancaire',
  'Avis d\'imposition ou taxe d\'habitation',
  'Attestation d\'assurance habitation',
  'Contrat de téléphonie fixe ou internet',
] as const;

export function KycProofOfAddressPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);

  const { data: kycStatus }  = useKycStatus();
  const startKyc             = useStartKyc();
  const uploadDoc            = useUploadDocument();

  const submitting = uploadDoc.isPending || startKyc.isPending;

  const handleContinue = async () => {
    if (!file) return;
    try {
      // Obtenir ou créer le dossier KYC
      let caseUuid = (kycStatus as Record<string, unknown>)?.uuid as string | undefined;
      if (!caseUuid) {
        const kycCase = await startKyc.mutateAsync();
        caseUuid = kycCase.uuid;
      }
      if (caseUuid) {
        await uploadDoc.mutateAsync({
          caseUuid,
          documentType: 'proof_of_address',
          file,
        });
      }
    } catch {
      // best-effort — on navigue quand même
    }
    navigate('/kyc/source-des-fonds');
  };

  return (
    <OnboardingLayout
      sidebar={
        <StepperVertical
          title="Onboarding"
          steps={KYC_STEPS as unknown as Array<{ label: string }>}
          currentIndex={3}
        />
      }
      aside={
        <>
          <KycStatusCard status="in_progress" lastUpdated="aujourd'hui, 10:24" />

          {/* Documents acceptés */}
          <div className="rounded-xl border border-ink-200 bg-white p-4">
            <p className="text-sm font-semibold text-ink-900 mb-3">Documents acceptés</p>
            <ul className="flex flex-col gap-2">
              {ACCEPTED_DOCS.map((doc) => (
                <li key={doc} className="flex items-start gap-2 text-xs text-ink-600">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-status-success" aria-hidden />
                  {doc}
                </li>
              ))}
            </ul>
          </div>

          {/* Exemples bon/mauvais */}
          <div className="rounded-xl border border-ink-200 bg-white p-4">
            <p className="text-sm font-semibold text-ink-900 mb-3">Exemples</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative rounded-lg overflow-hidden border border-status-success/40 bg-status-success-bg/30 p-3 flex flex-col items-center gap-1">
                <p className="text-[10px] font-bold text-ink-500 uppercase">Facture d'électricité</p>
                <div className="h-12 w-full rounded bg-ink-200/50 flex items-center justify-center">
                  <span className="text-xs text-ink-400">Logo</span>
                </div>
                <div className="absolute bottom-1.5 right-1.5">
                  <CheckCircle className="h-5 w-5 text-status-success" />
                </div>
              </div>
              <div className="relative rounded-lg overflow-hidden border border-status-danger/40 bg-status-danger-bg/30 p-3 flex flex-col items-center gap-1">
                <p className="text-[10px] font-bold text-ink-500 uppercase">Document expiré</p>
                <div className="h-12 w-full rounded bg-ink-200/50" />
                <div className="absolute bottom-1.5 right-1.5">
                  <XCircle className="h-5 w-5 text-status-danger" />
                </div>
              </div>
            </div>
          </div>
        </>
      }
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-950">Justificatif de domicile</h1>
        <p className="mt-1 text-sm text-ink-500 max-w-lg">
          Veuillez fournir un justificatif de domicile récent (moins de 3 mois)
          à votre nom et à l'adresse renseignée lors de votre inscription.
        </p>
      </div>

      <div className="max-w-xl">
        <h2 className="text-base font-semibold text-ink-900 mb-4">
          Téléchargez votre justificatif de domicile
        </h2>

        <FileDropzone
          onFileChange={setFile}
          accept=".pdf,.jpg,.jpeg,.png"
          maxSizeMb={10}
          className="mb-4"
        />

        {/* Sécurité */}
        <div className="flex items-start gap-2 rounded-lg bg-ink-50 p-3 mb-3">
          <span className="text-primary-600 text-sm">🔒</span>
          <p className="text-xs text-ink-500">
            Vos documents sont chiffrés et stockés en toute sécurité.
            Aucun document ne sera partagé sans votre accord.
          </p>
        </div>

        {/* Délai */}
        <div className="flex items-start gap-2 text-xs text-ink-400 mb-6">
          <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
          <span>
            Une fois votre justificatif validé, vous pourrez passer à l'étape suivante.
            Le délai de validation moyen est de 1 à 24h ouvrées.
          </span>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            iconLeft={<span>←</span>}
          >
            Précédent
          </Button>
          <Button
            disabled={!file}
            loading={submitting}
            onClick={handleContinue}
            iconRight={<span>→</span>}
          >
            Continuer
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
