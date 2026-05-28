import { useNavigate }    from 'react-router-dom';
import { useForm }        from 'react-hook-form';
import { zodResolver }    from '@hookform/resolvers/zod';
import { OnboardingLayout } from '@/components/layout/OnboardingLayout/OnboardingLayout';
import { StepperVertical }  from '@/components/ui/StepperVertical';
import { RadioCard }        from '@/components/ui/RadioCard';
import { Select }           from '@/components/ui/Select';
import { Button }           from '@/components/ui/Button';
import { KycStatusCard }    from '@/features/kyc/components/KycStatusCard/KycStatusCard';
import { useSaveSourceOfFunds } from '@/hooks/useKyc';
import { sourceOfFundsSchema, type SourceOfFundsValues, KYC_STEPS } from '@/features/kyc/schemas/kyc.schema';

const FUND_SOURCES = [
  { value: 'salary',      label: 'Salaire / Revenus professionnels', desc: 'Revenus d\'activité principale ou secondaire'   },
  { value: 'savings',     label: 'Épargne personnelle',              desc: 'Économies constituées au fil du temps'          },
  { value: 'investment',  label: 'Revenus de placement',            desc: 'Dividendes, plus-values, revenus immobiliers'   },
  { value: 'inheritance', label: 'Héritage / Donation',             desc: 'Transmission de patrimoine'                     },
  { value: 'business',    label: 'Revenus d\'entreprise',           desc: 'Bénéfices d\'activité commerciale ou libérale'  },
  { value: 'other',       label: 'Autre',                           desc: 'Précisez dans le champ ci-dessous'              },
] as const;

const INCOME_BRACKETS = [
  { value: '<1000',      label: 'Moins de 1 000 €/mois'     },
  { value: '1000-3000',  label: 'De 1 000 à 3 000 €/mois'  },
  { value: '3000-7000',  label: 'De 3 000 à 7 000 €/mois'  },
  { value: '7000-15000', label: 'De 7 000 à 15 000 €/mois' },
  { value: '>15000',     label: 'Plus de 15 000 €/mois'     },
] as const;

export function KycSourceOfFundsPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<SourceOfFundsValues>({ resolver: zodResolver(sourceOfFundsSchema), mode: 'onBlur' });

  const selectedSource = watch('fundSource');

  const saveSourceOfFunds = useSaveSourceOfFunds();
  const onSubmit = async (values: SourceOfFundsValues) => {
    await saveSourceOfFunds.mutateAsync({
      fundSource:    values.fundSource,
      monthlyIncome: values.monthlyIncome,
    });
    navigate('/kyc/revue');
  };

  return (
    <OnboardingLayout
      sidebar={
        <StepperVertical title="Vérification KYC"
          steps={KYC_STEPS as unknown as Array<{ label: string }>}
          currentIndex={4}
        />
      }
      aside={<KycStatusCard status="in_progress" lastUpdated="aujourd'hui, 10:24" />}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-950">Source des fonds</h1>
        <p className="mt-1 text-sm text-ink-500 max-w-lg">
          Ces informations sont requises par la réglementation anti-blanchiment (AML).
          Elles restent strictement confidentielles.
        </p>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
          {/* Source principale */}
          <fieldset>
            <legend className="text-sm font-semibold text-ink-800 mb-3">
              Quelle est la principale source de vos fonds d'investissement ?
            </legend>
            <div className="flex flex-col gap-2">
              {FUND_SOURCES.map((src) => (
                <RadioCard
                  key={src.value}
                  value={src.value}
                  label={src.label}
                  description={src.desc}
                  {...register('fundSource')}
                  checked={selectedSource === src.value}
                />
              ))}
            </div>
            {errors.fundSource && <p className="mt-1 text-xs text-status-danger">{errors.fundSource.message}</p>}
          </fieldset>

          {/* Tranche de revenus */}
          <Select
            label="Tranche de revenus mensuels nets"
            required
            placeholder="Sélectionnez une tranche"
            options={INCOME_BRACKETS as unknown as Array<{ value: string; label: string }>}
            error={errors.monthlyIncome?.message}
            {...register('monthlyIncome')}
          />

          {/* Info réglementaire */}
          <div className="rounded-xl bg-ink-50 border border-ink-200 px-4 py-3">
            <p className="text-xs text-ink-500 leading-relaxed">
              <strong className="text-ink-700">Pourquoi ces informations ?</strong> Conformément à la directive AMLD6 et à la
              réglementation FINMA, nous sommes dans l'obligation de vérifier l'origine de vos fonds.
              Ces données sont chiffrées et ne sont jamais partagées avec des tiers.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)} iconLeft={<span>←</span>}>Précédent</Button>
            <Button type="submit" loading={isSubmitting} iconRight={<span>→</span>}>Continuer</Button>
          </div>
        </form>
      </div>
    </OnboardingLayout>
  );
}
