import { useState, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { loadStripe }        from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useAsset }          from '@/hooks/useAssets';
import { useStartPayment }   from '@/hooks/usePayment';
import { Clock, CreditCard, Zap, AlertCircle, Lock, CheckCircle } from 'lucide-react';
import { InvestLayout }      from '@/components/layout/InvestLayout/InvestLayout';
import { InvestRecapAside }  from '@/features/investment/components/InvestRecapAside/InvestRecapAside';
import { RadioCard }         from '@/components/ui/RadioCard';
import { Button }            from '@/components/ui/Button';
import { Spinner }           from '@/components/ui/Spinner';
import { type InvestState, type PaymentMethod } from '@/features/investment/schemas/invest.schema';

// ─── Stripe singleton ─────────────────────────────────────────────────────────
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? 'pk_test_placeholder',
);

// ─── Apparence Stripe Elements ────────────────────────────────────────────────
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontFamily:  '"Plus Jakarta Sans", system-ui, sans-serif',
      fontSize:    '14px',
      color:       '#0f172a',
      '::placeholder': { color: '#94a3b8' },
    },
    invalid: { color: '#ef4444', iconColor: '#ef4444' },
  },
  hidePostalCode: true,
};

// ─── Méthodes de paiement ─────────────────────────────────────────────────────
const PAYMENT_METHODS: {
  id:    PaymentMethod;
  label: string;
  desc:  string;
  delay: string;
  fees:  string;
  icon:  React.ReactNode;
}[] = [
  { id: 'sepa',       label: 'Virement SEPA',           desc: 'Effectuez un virement depuis votre banque.', delay: '1–3 jours ouvrés', fees: 'Aucun frais', icon: <span className="text-xl">🏦</span> },
  { id: 'card',       label: 'Carte bancaire',           desc: 'Visa ou Mastercard. Traitement immédiat.',   delay: 'Immédiat',         fees: '+0,5 %',      icon: <CreditCard className="h-5 w-5" /> },
  { id: 'stablecoin', label: 'Stablecoins (EURC / USDC)', desc: 'Euros numériques depuis votre wallet crypto.', delay: 'Immédiat',      fees: 'Aucun frais', icon: <Zap className="h-5 w-5" /> },
];

// ─── Formulaire carte (sous-composant pour accéder au contexte Stripe) ────────
interface CardFormProps {
  clientSecret:  string;
  amountDisplay: string;
  onSuccess:     (paymentIntentId: string) => void;
  onError:       (msg: string) => void;
}

function CardPaymentForm({ clientSecret, amountDisplay, onSuccess, onError }: CardFormProps) {
  const stripe   = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setPaying(true);
    setCardError(null);

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (error) {
      setCardError(error.message ?? 'Paiement refusé.');
      onError(error.message ?? 'Paiement refusé.');
      setPaying(false);
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      onSuccess(paymentIntent?.id ?? '');
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-3">
        <label className="block text-xs font-semibold text-ink-500 mb-2">
          Numéro de carte
        </label>
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>

      {cardError && (
        <div className="flex items-start gap-2 rounded-xl bg-status-danger-bg border border-status-danger/30 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-status-danger shrink-0 mt-0.5" />
          <p className="text-sm text-status-danger">{cardError}</p>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-ink-400">
        <Lock className="h-3.5 w-3.5" />
        Paiement sécurisé par Stripe · TLS 1.3 · PCI DSS Level 1
      </div>

      <Button fullWidth size="lg" loading={paying} onClick={handlePay} disabled={!stripe || paying}>
        Payer {amountDisplay} maintenant
      </Button>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export function InvestPaymentPage() {
  const { assetId }  = useParams<{ assetId: string }>();
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const amount       = Number(params.get('amount') ?? 150);

  const { data: assetData } = useAsset(assetId);

  const assetBase = {
    assetId:         (assetData?.uuid as string) ?? assetId ?? '',
    assetName:       (assetData?.name as string) ?? '',
    assetStatus:     (assetData?.state as string) ?? 'financing',
    assetLocation:   [(assetData as Record<string,unknown>)?.city, (assetData as Record<string,unknown>)?.region].filter(Boolean).join(', '),
    cellUnitPrice:   (assetData?.cell_unit_price as number) ?? 1.0,
    targetYieldRate: (assetData?.target_yield_rate as number) ?? 0,
  };

  const [method, setMethod]   = useState<PaymentMethod>('sepa');
  const [error, setError]     = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Résultat après createOrder + createIntent
  const [paymentData, setPaymentData] = useState<{
    orderUuid:              string;
    paymentTransactionUuid: string;
    clientSecret:           string | null;
    amountCents:            number;
  } | null>(null);

  const sepaRef = useRef(`SC-${Math.random().toString(36).slice(2,10).toUpperCase()}`);

  const startPayment = useStartPayment();

  const state: InvestState = { ...assetBase, amount, paymentMethod: method };
  const amountDisplay = `${amount.toFixed(2)} €`;
  const cells = Math.floor(amount / (assetBase.cellUnitPrice || 1));

  // ── Étape 1 : créer l'ordre et (si carte) le PaymentIntent ─────────────────
  const handleProceed = async () => {
    if (paymentData) return; // déjà initié
    setError(null);
    setPending(true);
    try {
      const result = await startPayment.mutateAsync({
        assetUuid:      assetBase.assetId,
        cellsRequested: cells,
        paymentMethod:  method,
      });
      setPaymentData(result);

      // SEPA / stablecoin → naviguer directement vers la confirmation
      if (method !== 'card') {
        navigate(`/investir/${assetBase.assetId}/confirmation?order=${result.orderUuid}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'initialisation du paiement.';
      setError(msg);
    } finally {
      setPending(false);
    }
  };

  // ── Étape 2 (carte) : Stripe confirme → naviguer vers confirmation ──────────
  const handleCardSuccess = (paymentIntentId: string) => {
    if (!paymentData) return;
    // Le webhook Stripe → Odoo va valider l'ordre en arrière-plan
    navigate(`/investir/${assetBase.assetId}/confirmation?order=${paymentData.orderUuid}&intent=${paymentIntentId}`);
  };

  // ── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <InvestLayout currentStep={1} aside={<InvestRecapAside state={state} />}>
      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
        <h1 className="text-xl font-bold text-ink-950 mb-1">Mode de paiement</h1>
        <p className="text-sm text-ink-500 mb-6">
          Sélectionnez le mode le plus adapté à votre situation.
        </p>

        {/* Sélection de la méthode */}
        <fieldset className="flex flex-col gap-3 mb-6" disabled={!!paymentData}>
          <legend className="sr-only">Mode de paiement</legend>
          {PAYMENT_METHODS.map((pm) => (
            <RadioCard
              key={pm.id}
              name="paymentMethod"
              value={pm.id}
              checked={method === pm.id}
              onChange={() => { setMethod(pm.id); setPaymentData(null); setError(null); }}
              label={pm.label}
              description={pm.desc}
              icon={pm.icon}
              meta={
                <div className="flex gap-4 mt-1">
                  <div className="flex items-center gap-1 text-xs text-ink-400">
                    <Clock className="h-3 w-3" /> {pm.delay}
                  </div>
                  <span className="text-xs font-medium text-ink-600">{pm.fees}</span>
                </div>
              }
            />
          ))}
        </fieldset>

        {/* ── SEPA : infos de virement ────────────────────────────────────── */}
        {method === 'sepa' && (
          <div className="mb-6 rounded-xl bg-ink-50 border border-ink-200 p-4">
            <p className="text-sm font-semibold text-ink-800 mb-2">Coordonnées de virement</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
              <dt className="text-ink-500">Bénéficiaire</dt><dd className="font-medium text-ink-800">SolarCells SAS</dd>
              <dt className="text-ink-500">IBAN</dt>         <dd className="font-mono font-medium text-ink-800">FR76 3000 6000 0112 3456 7890 189</dd>
              <dt className="text-ink-500">BIC</dt>          <dd className="font-mono font-medium text-ink-800">BNPAFRPPXXX</dd>
              <dt className="text-ink-500">Référence</dt>    <dd className="font-mono font-medium text-primary-700">{sepaRef.current}</dd>
              <dt className="text-ink-500">Montant exact</dt><dd className="font-bold text-ink-900">{amountDisplay}</dd>
            </dl>
            <p className="mt-3 text-[11px] text-ink-400 leading-relaxed">
              Mentionnez impérativement la référence dans le libellé. Votre commande sera validée dès réception du virement (1–3 jours ouvrés).
            </p>
          </div>
        )}

        {/* ── Stablecoin ──────────────────────────────────────────────────── */}
        {method === 'stablecoin' && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">Paiement en stablecoins</p>
            <p className="text-xs text-amber-700">
              Envoyez exactement <strong>{amountDisplay}</strong> en EURC ou USDC à l'adresse de custody fournie après confirmation. La conversion est gérée par Bridge Protocol.
            </p>
          </div>
        )}

        {/* ── Carte : Stripe Elements ────────────────────────────────────── */}
        {method === 'card' && paymentData?.clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret: paymentData.clientSecret }}>
            <CardPaymentForm
              clientSecret={paymentData.clientSecret}
              amountDisplay={amountDisplay}
              onSuccess={handleCardSuccess}
              onError={(msg) => setError(msg)}
            />
          </Elements>
        )}

        {/* Erreur globale */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-status-danger-bg border border-status-danger/30 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-status-danger shrink-0 mt-0.5" />
            <p className="text-sm text-status-danger">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-2">
          <Button variant="ghost" onClick={() => navigate(-1)} iconLeft={<span>←</span>}>
            Retour
          </Button>

          {/* Bouton principal — masqué quand le formulaire carte est affiché */}
          {!(method === 'card' && paymentData?.clientSecret) && (
            <Button
              size="lg"
              loading={pending}
              disabled={pending}
              onClick={handleProceed}
            >
              {method === 'card'
                ? `Procéder au paiement →`
                : `Confirmer l'ordre → ${amountDisplay}`}
            </Button>
          )}
        </div>

        {/* Badge sécurité */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-ink-400">
          <Lock className="h-3 w-3" />
          Connexion sécurisée TLS · Données chiffrées AES-256 · Certifié PCI DSS
        </div>
      </div>
    </InvestLayout>
  );
}
