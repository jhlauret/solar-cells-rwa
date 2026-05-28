import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ShieldCheck, Globe } from 'lucide-react';

import { SplitLayout } from '@/components/layout/SplitLayout/SplitLayout';
import { Stepper }      from '@/components/ui/Stepper';
import { Input }        from '@/components/ui/Input';
import { PasswordInput }from '@/components/ui/PasswordInput';
import { Select }       from '@/components/ui/Select';
import { Checkbox }     from '@/components/ui/Checkbox';
import { Button }       from '@/components/ui/Button';
import { useAuth }      from '@/contexts/AuthContext';
import { ApiError }     from '@/lib/api-client';
import { SignupHeroAside } from '@/features/auth/components/SignupHeroAside/SignupHeroAside';
import { GoogleOAuthButton } from '@/features/auth/components/GoogleOAuthButton/GoogleOAuthButton';
import {
  signupSchema,
  type SignupFormValues,
  COUNTRY_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
} from '@/features/auth/schemas/signup.schema';

const STEPS = [
  { label: 'Compte' },
  { label: 'Vérification' },
  { label: 'Confirmation' },
];

export function SignupPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode:     'onBlur',
    defaultValues: {
      accountType:       'individual',
      acceptedMarketing: false,
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    try {
      await registerUser({
        name:           values.name,
        email:          values.email,
        password:       values.password,
        countryCode:    values.countryCode ?? 'FR',
        investorType:   'retail',
        termsAccepted:  true,
        marketingOptin: values.acceptedMarketing ?? false,
      });
      navigate('/verifier-email');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erreur lors de l\'inscription.';
      setError('root', { message });
    }
  };

  return (
    <SplitLayout aside={<SignupHeroAside />}>
      {/* Header minimal */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-ink-100">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="text-base font-bold">
            <span className="text-ink-900">Solar</span>
            <span className="text-primary-700">Cells</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800">
            <Globe className="h-4 w-4" aria-hidden /> FR
          </button>
          <span className="text-sm text-ink-400">Déjà un compte ?</span>
          <Link to="/connexion" className="text-sm font-semibold text-primary-700 no-underline hover:text-primary-800">
            Se connecter
          </Link>
        </div>
      </div>

      {/* Contenu formulaire */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-10">
        <div className="w-full max-w-md">
          {/* Stepper */}
          <Stepper steps={STEPS} currentIndex={0} className="mb-8" />

          {/* Titre */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-ink-950">Créer votre compte</h1>
            <p className="mt-1 text-sm text-ink-500">
              Commencez votre expérience Solar Cells en quelques étapes simples.
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            {/* Email */}
            <Input
              label="Adresse e-mail"
              type="email"
              placeholder="exemple@domaine.com"
              autoComplete="email"
              required
              iconLeft={<Mail className="h-4 w-4" aria-hidden />}
              error={errors.email?.message}
              {...register('email')}
            />

            {/* Mot de passe */}
            <PasswordInput
              label="Mot de passe"
              placeholder="Minimum 8 caractères"
              autoComplete="new-password"
              required
              hint="Au moins 8 caractères, une majuscule et un chiffre"
              error={errors.password?.message}
              {...register('password')}
            />

            {/* Confirmer le mot de passe */}
            <PasswordInput
              label="Confirmer le mot de passe"
              placeholder="Confirmez votre mot de passe"
              autoComplete="new-password"
              required
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            {/* Pays + Type de compte */}
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Pays de résidence"
                required
                placeholder="Sélectionnez votre pays"
                options={COUNTRY_OPTIONS as unknown as Array<{ value: string; label: string }>}
                error={errors.countryOfResidence?.message}
                {...register('countryOfResidence')}
              />
              <Select
                label="Type de compte"
                required
                options={ACCOUNT_TYPE_OPTIONS as unknown as Array<{ value: string; label: string }>}
                error={errors.accountType?.message}
                {...register('accountType')}
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col gap-3 pt-1">
              <Checkbox
                label={
                  <span>
                    J'accepte les{' '}
                    <Link to="/conditions" className="text-primary-700 hover:underline">
                      Conditions d'utilisation
                    </Link>
                    {' '}et la{' '}
                    <Link to="/confidentialite" className="text-primary-700 hover:underline">
                      Politique de confidentialité
                    </Link>
                    .
                  </span>
                }
                error={errors.acceptedTerms?.message}
                {...register('acceptedTerms')}
              />
              <Checkbox
                label="J'accepte de recevoir des informations et des offres de Solar Cells."
                {...register('acceptedMarketing')}
              />
            </div>

            {/* Erreur globale API */}
            {errors.root && (
              <p className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">
                {errors.root.message}
              </p>
            )}

            {/* CTA */}
            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isSubmitting}
              className="mt-2"
            >
              Créer mon compte
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-ink-400">OU</span>
            </div>
          </div>

          {/* Google OAuth */}
          <GoogleOAuthButton />

          {/* Badge sécurité */}
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-ink-50 p-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary-600 mt-0.5" aria-hidden />
            <p className="text-xs text-ink-500">
              Vos données sont protégées et sécurisées.{' '}
              <span className="font-medium text-ink-700">Conformité RGPD & KYC/AML.</span>
            </p>
          </div>
        </div>
      </div>
    </SplitLayout>
  );
}
