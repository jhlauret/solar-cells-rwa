import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Phone, Globe2, Calendar, Flag } from 'lucide-react';
import { useSavePersonalInfo } from '@/hooks/useKyc';

import { OnboardingLayout }  from '@/components/layout/OnboardingLayout/OnboardingLayout';
import { StepperVertical }   from '@/components/ui/StepperVertical';
import { Input }             from '@/components/ui/Input';
import { Select }            from '@/components/ui/Select';
import { Button }            from '@/components/ui/Button';
import { KycStatusCard }     from '@/features/kyc/components/KycStatusCard/KycStatusCard';
import { KycSecurityAside }  from '@/features/kyc/components/KycSecurityAside/KycSecurityAside';
import {
  personalInfoSchema,
  type PersonalInfoValues,
  NATIONALITY_OPTIONS,
  KYC_STEPS,
} from '@/features/kyc/schemas/kyc.schema';
import { COUNTRY_OPTIONS } from '@/features/auth/schemas/signup.schema';

// Icons KYC horizontaux (PDF p.4)
const KYC_ICONS = [User, '🪪', '🤳', '🏠', '💰', '✅'] as const;

export function KycPersonalInfoPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PersonalInfoValues>({
    resolver: zodResolver(personalInfoSchema),
    mode:     'onBlur',
    defaultValues: { email: 'alexandre.bernard@email.com' }, // pré-rempli depuis le compte
  });

  const saveInfo = useSavePersonalInfo();

  const onSubmit = async (values: PersonalInfoValues) => {
    try {
      await saveInfo.mutateAsync({
        dateOfBirth: values.dateOfBirth ?? '',
        nationality: values.nationality ?? 'FR',
        phone:       values.phone ?? '',
      });
      navigate('/kyc/identite');
    } catch {
      navigate('/kyc/identite'); // best-effort — on continue même si l'update échoue
    }
  };

  return (
    <OnboardingLayout
      sidebar={
        <StepperVertical
          title="Vérification KYC"
          steps={KYC_STEPS as unknown as Array<{ label: string }>}
          currentIndex={0}
        />
      }
      aside={
        <>
          <KycStatusCard status="in_progress" lastUpdated="aujourd'hui, 10:24" />
          <KycSecurityAside />
        </>
      }
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-950">Vérification de votre identité</h1>
        <p className="mt-1 text-sm text-ink-500 max-w-lg">
          Conformément aux réglementations en vigueur (KYC/AML), nous devons vérifier
          votre identité avant de vous permettre d'investir.
        </p>
      </div>

      {/* Progression horizontale d'icônes */}
      <nav aria-label="Étapes de vérification" className="mb-8">
        <ol className="flex items-center gap-2">
          {KYC_STEPS.map((step, i) => (
            <li key={i} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm
                  ${i === 0
                    ? 'bg-primary-600 text-white shadow-card'
                    : 'bg-ink-100 text-ink-400'
                  }`}
                aria-current={i === 0 ? 'step' : undefined}
              >
                {i + 1}
              </div>
              <span className={`text-[10px] text-center max-w-[56px] leading-tight font-medium
                ${i === 0 ? 'text-primary-700' : 'text-ink-400'}`}>
                {step.label.split(' ')[0]}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      {/* Formulaire */}
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Informations personnelles</h2>
        <p className="text-sm text-ink-500 mb-6">
          Veuillez renseigner vos informations telles qu'elles apparaissent sur votre pièce d'identité.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Prénom(s)"
              placeholder="Alexandre"
              required
              iconLeft={<User className="h-4 w-4" aria-hidden />}
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Nom"
              placeholder="Bernard"
              required
              iconLeft={<User className="h-4 w-4" aria-hidden />}
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date de naissance"
              type="date"
              required
              iconLeft={<Calendar className="h-4 w-4" aria-hidden />}
              error={errors.dateOfBirth?.message}
              {...register('dateOfBirth')}
            />
            <Select
              label="Nationalité"
              required
              placeholder="Sélectionnez votre nationalité"
              options={NATIONALITY_OPTIONS as unknown as Array<{ value: string; label: string }>}
              error={errors.nationality?.message}
              {...register('nationality')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Pays de résidence"
              required
              placeholder="Sélectionnez votre pays"
              options={COUNTRY_OPTIONS as unknown as Array<{ value: string; label: string }>}
              error={errors.countryOfResidence?.message}
              {...register('countryOfResidence')}
            />
            <Input
              label="Numéro de téléphone"
              type="tel"
              placeholder="+33 6 12 34 56 78"
              required
              iconLeft={<Phone className="h-4 w-4" aria-hidden />}
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>

          <Input
            label="Adresse e-mail"
            type="email"
            required
            readOnly
            iconLeft={<Mail className="h-4 w-4" aria-hidden />}
            hint="Votre e-mail est pré-rempli depuis votre compte."
            error={errors.email?.message}
            {...register('email')}
          />

          {/* Info sécurité */}
          <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-4 py-3">
            <span className="text-primary-600">🔒</span>
            <p className="text-xs text-ink-500">
              Vos données sont sécurisées et chiffrées.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <span />
            <Button type="submit" loading={isSubmitting} iconRight={<span>→</span>}>
              Continuer
            </Button>
          </div>
        </form>
      </div>
    </OnboardingLayout>
  );
}
