import { useState } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { useAsset } from '@/hooks/useAssets';
import { ShieldCheck } from 'lucide-react';
import { InvestLayout }     from '@/components/layout/InvestLayout/InvestLayout';
import { InvestRecapAside } from '@/features/investment/components/InvestRecapAside/InvestRecapAside';
import { Checkbox }         from '@/components/ui/Checkbox';
import { Button }           from '@/components/ui/Button';
import { Badge }            from '@/components/ui/Badge';
import { type InvestState, type PaymentMethod, computeOrder } from '@/features/investment/schemas/invest.schema';

// assetState built from URL params

const METHOD_LABELS: Record<PaymentMethod, string> = {
  sepa: 'Virement SEPA', card: 'Carte bancaire', stablecoin: 'Stablecoin (EURC/USDC)',
};

export function InvestSummaryPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate    = useNavigate();
  const [params]    = useSearchParams();
  const amount      = Number(params.get('amount') ?? 150);
  const method      = (params.get('method') ?? 'sepa') as PaymentMethod;
  const { data: assetData } = useAsset(assetId);
  const MOCK_BASE = {
    assetId:         assetData?.uuid ?? assetId ?? '',
    assetName:       (assetData?.name as string) ?? '',
    assetStatus:     (assetData?.state as string) ?? 'financing',
    assetLocation:   [(assetData as Record<string,unknown>)?.city, (assetData as Record<string,unknown>)?.region].filter(Boolean).join(', '),
    cellUnitPrice:   (assetData?.cell_unit_price as number) ?? 1.0,
    targetYieldRate: (assetData?.target_yield_rate as number) ?? 0,
  };
  const [accepted, setAccepted] = useState(false);

  const state: InvestState = { ...MOCK_BASE, amount, paymentMethod: method };
  const { fees, total, cells, annualRevenue } = computeOrder(state);

  const handleConfirm = () => {
    navigate(`/investir/${MOCK_BASE.assetId}/paiement?amount=${amount}`);
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-bold text-ink-400 uppercase tracking-wide mb-2">{children}</p>
  );

  return (
    <InvestLayout currentStep={2} aside={<InvestRecapAside state={state} />}>
      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
        <h1 className="text-xl font-bold text-ink-950 mb-1">Résumé de votre investissement</h1>
        <p className="text-sm text-ink-500 mb-6">Vérifiez les informations avant de confirmer.</p>

        {/* Actif */}
        <section className="mb-5">
          <SectionTitle>Actif</SectionTitle>
          <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <span className="text-lg">☀️</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">{MOCK_BASE.assetName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge tone="warning" dot className="text-[10px]">En financement</Badge>
                <span className="text-xs text-ink-400">{MOCK_BASE.assetLocation}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Votre investissement */}
        <section className="mb-5">
          <SectionTitle>Votre investissement</SectionTitle>
          <div className="rounded-xl border border-ink-200 divide-y divide-ink-100">
            {[
              { label: 'Montant investi',        value: `${amount.toFixed(2)} €`,     main: false },
              { label: 'Frais',                  value: fees === 0 ? 'Inclus' : `${fees.toFixed(2)} €`, main: false },
              { label: 'Total à payer',           value: `${total.toFixed(2)} €`,      main: true  },
              { label: 'Solar Cells reçues',      value: `${cells.toLocaleString('fr-FR')} SCT`, main: false, highlight: true },
              { label: 'Rendement cible',         value: `${(MOCK_BASE.targetYieldRate * 100).toFixed(1)}% / an`, main: false },
              { label: 'Revenu annuel estimé',    value: `~${annualRevenue.toFixed(2)} €/an`, main: false },
              { label: 'Distribution',            value: 'Trimestrielle', main: false },
              { label: 'Mode de paiement',        value: METHOD_LABELS[method], main: false },
            ].map(({ label, value, main, highlight }) => (
              <div key={label} className={`flex justify-between px-4 py-2.5 ${main ? 'bg-ink-50' : ''}`}>
                <span className={`text-xs ${main ? 'font-semibold text-ink-800' : 'text-ink-500'}`}>{label}</span>
                <span className={`text-xs tabular-nums ${highlight ? 'font-bold text-primary-700' : main ? 'font-bold text-ink-900' : 'font-medium text-ink-700'}`}>{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Conditions */}
        <section className="mb-6">
          <SectionTitle>Conditions</SectionTitle>
          <div className="rounded-xl border border-ink-200 p-4 flex flex-col gap-2">
            <Checkbox
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              label={
                <span className="text-xs">
                  Je confirme avoir lu et accepté les{' '}
                  <Link to="/conditions" className="text-primary-700 hover:underline">Conditions générales</Link>
                  {' '}et la{' '}
                  <Link to="/risques" className="text-primary-700 hover:underline">Notice d'information sur les risques</Link>.
                  Je comprends que cet investissement comporte des risques, dont la perte partielle ou totale du capital investi.
                </span>
              }
            />
          </div>
        </section>

        {/* Trust */}
        <div className="mb-6 flex items-start gap-2 rounded-xl bg-primary-50 p-3">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary-600 mt-0.5" aria-hidden />
          <p className="text-xs text-primary-700 leading-relaxed">
            Votre investissement est sécurisé. Les Solar Cells seront crédités sur votre compte SolarCells après confirmation du paiement.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} iconLeft={<span>←</span>}>Retour</Button>
          <Button size="lg" disabled={!accepted} loading={submitting} onClick={handleConfirm}>
            Confirmer l'investissement ✓
          </Button>
        </div>
      </div>
    </InvestLayout>
  );
}
