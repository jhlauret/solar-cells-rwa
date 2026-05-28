import { useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { Euro, TrendingUp, Zap, MapPin } from 'lucide-react';
import { InvestLayout }     from '@/components/layout/InvestLayout/InvestLayout';
import { InvestRecapAside } from '@/features/investment/components/InvestRecapAside/InvestRecapAside';
import { Input }            from '@/components/ui/Input';
import { Button }           from '@/components/ui/Button';
import { Badge }            from '@/components/ui/Badge';
import { Spinner }          from '@/components/ui/Spinner';
import { cn }               from '@/lib/utils/cn';
import { useAsset }         from '@/hooks/useAssets';
import { type InvestState, computeOrder } from '@/features/investment/schemas/invest.schema';

const PRESETS = [10, 50, 100, 500] as const;

export function InvestAmountPage() {
  const { assetId }    = useParams<{ assetId: string }>();
  const navigate       = useNavigate();
  const [params]       = useSearchParams();
  const initialAmount  = Number(params.get('amount') ?? 0);

  const { data: assetData, isLoading } = useAsset(assetId);

  const [amount, setAmount]         = useState<number | ''>(initialAmount || '');
  const [customMode, setCustomMode] = useState(!PRESETS.includes(initialAmount as typeof PRESETS[number]));

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!assetData) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-50">
        <p className="text-ink-400">Actif introuvable.</p>
      </div>
    );
  }

  const assetState: Omit<InvestState, 'amount' | 'paymentMethod'> = {
    assetId:         (assetData.uuid as string) ?? assetId ?? '',
    assetName:       assetData.name as string ?? '',
    assetStatus:     assetData.state as string ?? '',
    assetLocation:   [assetData.city, assetData.region].filter(Boolean).join(', '),
    cellUnitPrice:   (assetData.cell_unit_price as number) ?? 1.0,
    targetYieldRate: (assetData.target_yield_rate as number) ?? 0,
  };

  const state: InvestState = {
    ...assetState,
    amount: Number(amount) || 0,
    paymentMethod: null,
  };
  const { cells, annualRevenue } = computeOrder(state);

  const canContinue = Number(amount) >= 1;

  const selectPreset = (p: number) => { setAmount(p); setCustomMode(false); };
  const selectCustom = ()          => { setCustomMode(true); setAmount(''); };

  return (
    <InvestLayout
      currentStep={0}
      aside={<InvestRecapAside state={state} />}
    >
      {/* Asset info card */}
      <div className="mb-6 flex items-start gap-4 rounded-xl border border-ink-200 bg-white p-4 shadow-card">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-100 to-ink-100">
          <Zap className="h-8 w-8 text-primary-400" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-ink-950 truncate">{assetState.assetName}</h2>
            <Badge tone="warning" dot className="text-[10px] shrink-0">En financement</Badge>
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-ink-400">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            {assetState.assetLocation}
          </div>
          <div className="mt-2 flex gap-4 text-xs">
            <span><span className="font-semibold text-ink-700">{assetState.cellUnitPrice.toFixed(2)} €</span> <span className="text-ink-400">/ Solar Cell</span></span>
            <span><span className="font-semibold text-primary-700">{(assetState.targetYieldRate * 100).toFixed(1)}%</span> <span className="text-ink-400">rendement cible</span></span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
        <h1 className="text-xl font-bold text-ink-950 mb-1">Montant à investir</h1>
        <p className="text-sm text-ink-500 mb-6">
          Sélectionnez un montant ou saisissez un montant personnalisé.
          1 Solar Cell = 1,00 €.
        </p>

        {/* Presets */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => selectPreset(p)}
              className={cn(
                'rounded-xl border-2 py-3 text-sm font-bold transition-all',
                !customMode && amount === p
                  ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                  : 'border-ink-200 text-ink-700 hover:border-primary-300 hover:bg-primary-50',
              )}
            >
              {p} €
            </button>
          ))}
        </div>

        {/* Bouton "Autre montant" */}
        <button
          onClick={selectCustom}
          className={cn(
            'w-full rounded-xl border-2 py-3 text-sm font-semibold transition-all mb-4',
            customMode
              ? 'border-primary-400 bg-primary-50 text-primary-700'
              : 'border-dashed border-ink-200 text-ink-400 hover:border-ink-300 hover:text-ink-600',
          )}
        >
          Autre montant
        </button>

        {/* Input montant libre */}
        {customMode && (
          <div className="mb-4">
            <Input
              type="number"
              placeholder="Ex. 250"
              min={1}
              max={100000}
              autoFocus
              iconLeft={<Euro className="h-4 w-4" aria-hidden />}
              value={amount}
              onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
              hint="Montant minimum 1 €"
            />
          </div>
        )}

        {/* Conversion + estimation */}
        {Number(amount) > 0 && (
          <div className="mb-6 flex flex-col gap-2 rounded-xl bg-primary-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-ink-600">Vous recevrez ≈</span>
              <span className="font-bold text-primary-700">
                {cells.toLocaleString('fr-FR')} Solar Cells (SCT)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-500">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-primary-500" aria-hidden />
                Revenu annuel estimé
              </div>
              <span className="font-semibold text-ink-700">
                ~{annualRevenue.toFixed(2)} € / an
                <span className="ml-1 text-primary-600">
                  soit {(assetState.targetYieldRate * 100).toFixed(1)}%
                </span>
              </span>
            </div>
          </div>
        )}

        {/* CTA */}
        <Button
          fullWidth
          size="lg"
          disabled={!canContinue}
          onClick={() => navigate(`/investir/${assetState.assetId}/paiement?amount=${amount}`)}
        >
          Continuer → Paiement
        </Button>

        <p className="mt-3 text-center text-xs text-ink-400">
          Les rendements sont estimatifs et non garantis. Risque de perte en capital.
        </p>
      </div>
    </InvestLayout>
  );
}
