import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { OnboardingLayout }  from '@/components/layout/OnboardingLayout/OnboardingLayout';
import { StepperVertical }   from '@/components/ui/StepperVertical';
import { FileDropzone }      from '@/components/ui/FileDropzone';
import { RadioCard }         from '@/components/ui/RadioCard';
import { Button }            from '@/components/ui/Button';
import { KycStatusCard }     from '@/features/kyc/components/KycStatusCard/KycStatusCard';
import { KYC_STEPS }        from '@/features/kyc/schemas/kyc.schema';
import { useKycStatus, useStartKyc, useUploadDocument } from '@/hooks/useKyc';

const DOC_TYPES = [
  { value: 'passport',      label: 'Passeport',        desc: 'International, recto seul' },
  { value: 'identity_card', label: "Carte d'identité", desc: 'Recto et verso'            },
  { value: 'residence',     label: 'Titre de séjour',  desc: 'Recto et verso'            },
] as const;

export function KycIdentityPage() {
  const navigate = useNavigate();
  const [docType, setDocType] = useState<string>('passport');
  const [front, setFront]     = useState<File | null>(null);
  const [back,  setBack]      = useState<File | null>(null);

  const { data: kycStatus } = useKycStatus();
  const startKyc            = useStartKyc();
  const uploadDoc           = useUploadDocument();

  const needsBack   = docType !== 'passport';
  const canContinue = front !== null && (!needsBack || back !== null);
  const uploading   = uploadDoc.isPending || startKyc.isPending;

  const handleContinue = async () => {
    if (!front) return;
    try {
      // Obtenir ou créer le dossier KYC
      let caseUuid = (kycStatus as Record<string, unknown>)?.uuid as string | undefined;
      if (!caseUuid) {
        const kycCase = await startKyc.mutateAsync();
        caseUuid = kycCase.uuid;
      }
      if (caseUuid) {
        await uploadDoc.mutateAsync({ caseUuid, documentType: docType, file: front });
        if (back) {
          await uploadDoc.mutateAsync({ caseUuid, documentType: `${docType}_back`, file: back });
        }
      }
    } catch {
      // best-effort
    }
    navigate('/kyc/selfie');
  };

  return (
    <OnboardingLayout
      sidebar={
        <StepperVertical title="Vérification KYC"
          steps={KYC_STEPS as unknown as Array<{ label: string }>}
          currentIndex={1}
        />
      }
      aside={<KycStatusCard status="in_progress" lastUpdated="aujourd'hui, 10:24" />}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-950">Pièce d'identité</h1>
        <p className="mt-1 text-sm text-ink-500 max-w-lg">
          Sélectionnez votre document officiel et téléchargez-le en haute qualité.
          Assurez-vous que toutes les informations sont lisibles.
        </p>
      </div>

      <div className="max-w-xl flex flex-col gap-6">
        {/* Choix du document */}
        <fieldset>
          <legend className="text-sm font-semibold text-ink-800 mb-3">Type de document</legend>
          <div className="flex flex-col gap-2">
            {DOC_TYPES.map((dt) => (
              <RadioCard
                key={dt.value}
                name="docType"
                value={dt.value}
                checked={docType === dt.value}
                onChange={() => setDocType(dt.value)}
                label={dt.label}
                description={dt.desc}
              />
            ))}
          </div>
        </fieldset>

        {/* Upload recto */}
        <div>
          <p className="text-sm font-semibold text-ink-800 mb-2">
            {docType === 'passport' ? 'Page principale du passeport' : 'Recto du document'}
          </p>
          <FileDropzone onFileChange={setFront} accept=".pdf,.jpg,.jpeg,.png" maxSizeMb={10} />
        </div>

        {/* Upload verso si nécessaire */}
        {needsBack && (
          <div>
            <p className="text-sm font-semibold text-ink-800 mb-2">Verso du document</p>
            <FileDropzone onFileChange={setBack} accept=".pdf,.jpg,.jpeg,.png" maxSizeMb={10} />
          </div>
        )}

        {/* Conseils */}
        <div className="rounded-xl bg-ink-50 p-4">
          <p className="text-xs font-semibold text-ink-700 mb-2">Conseils pour une photo réussie</p>
          <ul className="flex flex-col gap-1.5">
            {[
              'Document en cours de validité',
              'Photo nette et sans reflets',
              'Tous les bords du document visibles',
              'Aucune information masquée ou floutée',
            ].map((tip) => (
              <li key={tip} className="flex items-center gap-2 text-xs text-ink-500">
                <CheckCircle className="h-3.5 w-3.5 text-status-success shrink-0" aria-hidden />
                {tip}
              </li>
            ))}
            <li className="flex items-center gap-2 text-xs text-status-danger font-medium">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              N'acceptons pas les documents expirés ou les copies
            </li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} iconLeft={<span>←</span>}>Précédent</Button>
          <Button disabled={!canContinue} loading={uploading} onClick={handleContinue} iconRight={<span>→</span>}>Continuer</Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
