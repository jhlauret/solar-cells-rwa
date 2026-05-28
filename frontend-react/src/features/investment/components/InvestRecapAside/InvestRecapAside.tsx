import { ShieldCheck } from 'lucide-react';
import { Badge }      from '@/components/ui/Badge';
import { type InvestState, computeOrder, FEES } from '@/features/investment/schemas/invest.schema';

interface InvestRecapAsideProps {
  state: InvestState;
}

export function InvestRecapAside({ state }: InvestRecapAsideProps) {
  const { fees, total, cells, annualRevenue } = computeOrder(state);
  const hasAmount  = state.amount > 0;
  const hasPayment = state.paymentMethod !== null;

  const rows = [
    { label: 'Montant investi',        value: hasAmount ? `${state.amount.toFixed(2)} €` : '—' },
    { label: 'Frais de plateforme',    value: hasAmount && hasPayment ? (fees === 0 ? 'Inclus' : `${fees.toFixed(2)} €`) : '—' },
    { label: 'Total à payer',          value: hasAmount ? `${total.toFixed(2)} €` : '—', bold: true },
    { label: 'Solar Cells reçues',     value: hasAmount ? `${cells.toLocaleString('fr-FR')} SCT` : '—', highlight: true },
    { label: 'Rendement cible',        value: `${(state.targetYieldRate * 100).toFixed(1)}% / an` },
    { label: 'Revenu annuel estimé',   value: hasAmount ? `~${annualRevenue.toFixed(2)} €/an` : '—' },
    { label: 'Distribution',           value: 'Trimestrielle' },
  ];

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card-md sticky top-20 flex flex-col gap-4">
      {/* En-tête actif */}
      <div>
        <p className="text-xs font-bold text-ink-400 uppercase tracking-wide mb-1.5">
          Résumé de l'investissement
        </p>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100">
            <span className="text-lg">☀️</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900 leading-tight">{state.assetName}</p>
            <div className="mt-0.5">
              <Badge tone="warning" dot className="text-[10px]">En financement</Badge>
            </div>
            <p className="text-xs text-ink-400 mt-0.5">{state.assetLocation}</p>
          </div>
        </div>
      </div>

      {/* Tableau de chiffres */}
      <div className="rounded-xl bg-ink-50 p-3 flex flex-col gap-2">
        {rows.map(({ label, value, bold, highlight }) => (
          <div key={label} className={`flex justify-between ${bold ? 'border-t border-ink-200 pt-2 mt-1' : ''}`}>
            <span className={`text-xs ${bold ? 'font-semibold text-ink-800' : 'text-ink-500'}`}>{label}</span>
            <span className={`text-xs tabular-nums ${highlight ? 'font-bold text-primary-700' : bold ? 'font-bold text-ink-900' : 'font-medium text-ink-700'}`}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Mode de paiement si sélectionné */}
      {state.paymentMethod && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-400">Mode de paiement</span>
          <span className="font-semibold text-ink-700 capitalize">
            {state.paymentMethod === 'sepa' ? 'Virement SEPA' : state.paymentMethod === 'card' ? 'Carte bancaire' : 'Stablecoin'}
          </span>
        </div>
      )}

      {/* Trust */}
      <div className="flex items-start gap-2 rounded-lg bg-primary-50 p-2.5">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary-600 mt-0.5" aria-hidden />
        <p className="text-[10px] text-primary-700 leading-relaxed">
          Investissement sécurisé et réglementé. Conforme KYC/AML.
        </p>
      </div>
    </div>
  );
}
