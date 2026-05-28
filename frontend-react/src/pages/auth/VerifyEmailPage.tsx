import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

import { SplitLayout }   from '@/components/layout/SplitLayout/SplitLayout';
import { SignupHeroAside } from '@/features/auth/components/SignupHeroAside/SignupHeroAside';
import { Button }         from '@/components/ui/Button';
import { useAuth }        from '@/contexts/AuthContext';
import { useSendVerification, useVerifyEmail } from '@/hooks/useEmailVerification';
import { ApiError }       from '@/lib/api-client';

const OTP_LENGTH = 6;

export function VerifyEmailPage() {
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const { user, refreshUser } = useAuth();

  const partnerUuid = user?.partnerUuid ?? params.get('uuid') ?? '';
  const email       = user?.email       ?? params.get('email') ?? '';

  // Tableau de 6 cases
  const [digits, setDigits]   = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resent, setResent]   = useState(false);
  const [cooldown, setCooldown] = useState(0);   // secondes avant prochain envoi

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendOtp   = useSendVerification();
  const verifyOtp = useVerifyEmail();

  const otp = digits.join('');

  // ── Minuteur cooldown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // ── Envoi automatique à l'arrivée sur la page ─────────────────────────────
  useEffect(() => {
    if (partnerUuid) {
      sendOtp.mutate(partnerUuid);
      setCooldown(60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Gestion des champs OTP ────────────────────────────────────────────────
  const handleChange = (idx: number, val: string) => {
    // Accepter seulement les chiffres
    const char = val.replace(/\D/g, '').slice(-1);
    const next  = [...digits];
    next[idx]   = char;
    setDigits(next);
    setError(null);
    // Focus auto sur le champ suivant
    if (char && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  // Coller tout le code d'un coup
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      setDigits(pasted.split(''));
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  // ── Vérification ─────────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH || !partnerUuid) return;
    setError(null);
    try {
      await verifyOtp.mutateAsync({ partnerUuid, otp });
      setSuccess(true);
      // Rafraîchir l'état auth (account_state = 'active')
      await refreshUser();
      setTimeout(() => navigate('/kyc/informations'), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code incorrect.');
      // Vider les champs pour ressaisir
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  // ── Renvoi ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (cooldown > 0 || !partnerUuid) return;
    setError(null);
    setResent(false);
    try {
      await sendOtp.mutateAsync(partnerUuid);
      setResent(true);
      setCooldown(60);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors du renvoi.');
    }
  };

  // ── Submit sur entrée complète ────────────────────────────────────────────
  useEffect(() => {
    if (otp.length === OTP_LENGTH && !verifyOtp.isPending && !success) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  return (
    <SplitLayout aside={<SignupHeroAside />}>
      <div className="flex flex-col gap-6">

        {/* En-tête */}
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 mb-4">
            {success
              ? <CheckCircle className="h-6 w-6 text-status-success" />
              : <Mail className="h-6 w-6 text-primary-600" />}
          </div>
          <h1 className="text-2xl font-bold text-ink-950">
            {success ? 'Email vérifié !' : 'Vérifiez votre email'}
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {success
              ? 'Votre compte est activé. Redirection en cours…'
              : <>Entrez le code à 6 chiffres envoyé à <strong className="text-ink-700">{email}</strong>.</>}
          </p>
        </div>

        {/* Grille OTP */}
        {!success && (
          <>
            <div className="flex gap-2 justify-between" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={[
                    'h-14 w-full rounded-xl border-2 text-center text-2xl font-bold transition-all',
                    'focus:outline-none focus:ring-0',
                    error
                      ? 'border-status-danger text-status-danger bg-status-danger-bg'
                      : d
                      ? 'border-primary-500 text-ink-950 bg-white'
                      : 'border-ink-200 text-ink-950 bg-white focus:border-primary-500',
                  ].join(' ')}
                  autoFocus={i === 0}
                  aria-label={`Chiffre ${i + 1} du code`}
                />
              ))}
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-status-danger-bg border border-status-danger/30 px-4 py-3 -mt-2">
                <AlertCircle className="h-4 w-4 text-status-danger shrink-0 mt-0.5" />
                <p className="text-sm text-status-danger">{error}</p>
              </div>
            )}

            {/* Message de renvoi */}
            {resent && !error && (
              <p className="text-sm text-status-success -mt-2">
                ✓ Un nouveau code a été envoyé à {email}.
              </p>
            )}

            {/* Bouton de vérification */}
            <Button
              fullWidth
              size="lg"
              loading={verifyOtp.isPending}
              disabled={otp.length !== OTP_LENGTH || verifyOtp.isPending}
              onClick={handleVerify}
            >
              Vérifier mon email
            </Button>

            {/* Renvoi */}
            <div className="text-center">
              <p className="text-sm text-ink-400 mb-1">Vous n'avez pas reçu le code ?</p>
              <button
                onClick={handleResend}
                disabled={cooldown > 0 || sendOtp.isPending}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700
                           hover:text-primary-800 disabled:text-ink-300 disabled:cursor-not-allowed
                           transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {cooldown > 0
                  ? `Renvoyer dans ${cooldown}s`
                  : 'Renvoyer le code'}
              </button>
            </div>

            {/* Lien changer d'adresse */}
            <p className="text-center text-xs text-ink-400">
              Mauvaise adresse email ?{' '}
              <button
                onClick={() => navigate('/connexion')}
                className="font-semibold text-ink-600 hover:text-ink-800 underline"
              >
                Me reconnecter avec un autre compte
              </button>
            </p>
          </>
        )}

        {/* Succès */}
        {success && (
          <div className="rounded-xl bg-status-success-bg border border-status-success/30 px-4 py-3">
            <p className="text-sm font-medium text-status-success">
              ✓ Compte activé — redirection vers le KYC…
            </p>
          </div>
        )}
      </div>
    </SplitLayout>
  );
}
