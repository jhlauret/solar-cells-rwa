import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ShieldCheck, Globe } from 'lucide-react';

import { SplitLayout }  from '@/components/layout/SplitLayout/SplitLayout';
import { Input }        from '@/components/ui/Input';
import { PasswordInput }from '@/components/ui/PasswordInput';
import { Checkbox }     from '@/components/ui/Checkbox';
import { Button }       from '@/components/ui/Button';
import { GoogleOAuthButton } from '@/features/auth/components/GoogleOAuthButton/GoogleOAuthButton';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas/login.schema';
import { SignupHeroAside } from '@/features/auth/components/SignupHeroAside/SignupHeroAside';
import { useAuth }      from '@/contexts/AuthContext';
import { ApiError }     from '@/lib/api-client';

export function LoginPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/tableau-de-bord';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({
    resolver:     zodResolver(loginSchema),
    mode:         'onBlur',
    defaultValues: { rememberMe: false },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Identifiants incorrects.';
      setError('root', { message });
    }
  };

  return (
    <SplitLayout aside={<SignupHeroAside />}>
      {/* Header */}
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
          <span className="text-sm text-ink-400">Pas encore de compte ?</span>
          <Link
            to="/inscription"
            className="text-sm font-semibold text-primary-700 no-underline hover:text-primary-800"
          >
            S'inscrire
          </Link>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-ink-950">Bon retour !</h1>
            <p className="mt-1 text-sm text-ink-500">
              Connectez-vous à votre espace investisseur Solar Cells.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            {/* Erreur globale API */}
            {errors.root && (
              <div className="rounded-lg bg-status-danger-bg border border-status-danger/20 p-3">
                <p className="text-sm text-status-danger font-medium">
                  {errors.root.message}
                </p>
              </div>
            )}

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

            <PasswordInput
              label="Mot de passe"
              placeholder="Votre mot de passe"
              autoComplete="current-password"
              required
              error={errors.password?.message}
              {...register('password')}
            />

            {/* Se souvenir + mot de passe oublié */}
            <div className="flex items-center justify-between">
              <Checkbox
                label="Se souvenir de moi"
                {...register('rememberMe')}
              />
              <Link
                to="/mot-de-passe-oublie"
                className="text-xs font-medium text-primary-700 no-underline hover:text-primary-800"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isSubmitting}
              className="mt-2"
            >
              Se connecter
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-ink-400">OU</span>
            </div>
          </div>

          <GoogleOAuthButton />

          <div className="mt-5 flex items-start gap-2 rounded-lg bg-ink-50 p-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary-600 mt-0.5" aria-hidden />
            <p className="text-xs text-ink-500">
              Connexion sécurisée.{' '}
              <span className="font-medium text-ink-700">Conformité RGPD & KYC/AML.</span>
            </p>
          </div>
        </div>
      </div>
    </SplitLayout>
  );
}
