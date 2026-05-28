import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Input }   from '@/components/ui/Input';
import { Button }  from '@/components/ui/Button';
import { SplitLayout }   from '@/components/layout/SplitLayout/SplitLayout';
import { SignupHeroAside } from '@/features/auth/components/SignupHeroAside/SignupHeroAside';
import apiClient   from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';

type Step = 'email' | 'otp' | 'done';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep]       = useState<Step>('email');
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [password, setPass]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // ── Étape 1 : envoyer l'OTP ────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null); setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setStep('otp');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  // ── Étape 2 : vérifier OTP + nouveau mot de passe ─────────────────────────
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !password) return;
    if (password.length < 8) { setError('Mot de passe trop court (min 8 caractères).'); return; }
    setError(null); setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { email, otp, newPassword: password });
      setStep('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code incorrect ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SplitLayout aside={<SignupHeroAside />}>
      <div className="flex flex-col gap-6">

        {/* ── Étape 1 : email ──────────────────────────────────────────────── */}
        {step === 'email' && (
          <>
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 mb-4">
                <Mail className="h-6 w-6 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-ink-950">Mot de passe oublié</h1>
              <p className="mt-1.5 text-sm text-ink-500">
                Entrez votre adresse email. Nous vous enverrons un code à 6 chiffres pour réinitialiser votre mot de passe.
              </p>
            </div>

            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <Input
                label="Adresse email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                autoFocus
              />
              {error && <p className="text-sm text-status-danger">{error}</p>}
              <Button type="submit" fullWidth size="lg" loading={loading} disabled={!email || loading}>
                Recevoir le code de réinitialisation
              </Button>
            </form>

            <p className="text-center text-sm text-ink-400">
              <Link to="/connexion" className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:text-primary-800">
                <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
              </Link>
            </p>
          </>
        )}

        {/* ── Étape 2 : OTP + nouveau mdp ─────────────────────────────────── */}
        {step === 'otp' && (
          <>
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 mb-4">
                <Mail className="h-6 w-6 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-ink-950">Nouveau mot de passe</h1>
              <p className="mt-1.5 text-sm text-ink-500">
                Entrez le code envoyé à <strong className="text-ink-700">{email}</strong> et choisissez un nouveau mot de passe.
              </p>
            </div>

            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <Input
                label="Code de vérification (6 chiffres)"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                required
                autoFocus
              />
              <div className="relative">
                <Input
                  label="Nouveau mot de passe"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPass(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  required
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-8 text-ink-400 hover:text-ink-700">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && <p className="text-sm text-status-danger">{error}</p>}
              <Button type="submit" fullWidth size="lg" loading={loading}
                disabled={otp.length !== 6 || password.length < 8 || loading}>
                Réinitialiser mon mot de passe
              </Button>
            </form>

            <p className="text-center text-sm text-ink-400">
              Vous n'avez pas reçu le code ?{' '}
              <button onClick={() => setStep('email')}
                className="font-semibold text-primary-700 hover:text-primary-800">
                Ressaisir mon email
              </button>
            </p>
          </>
        )}

        {/* ── Étape 3 : succès ─────────────────────────────────────────────── */}
        {step === 'done' && (
          <>
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-status-success-bg mb-4">
                <CheckCircle className="h-6 w-6 text-status-success" />
              </div>
              <h1 className="text-2xl font-bold text-ink-950">Mot de passe réinitialisé</h1>
              <p className="mt-1.5 text-sm text-ink-500">
                Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.
              </p>
            </div>
            <Button fullWidth size="lg" onClick={() => navigate('/connexion')}>
              Se connecter
            </Button>
          </>
        )}
      </div>
    </SplitLayout>
  );
}
