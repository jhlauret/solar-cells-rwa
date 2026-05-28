import { useState } from 'react';
import { Link }         from 'react-router-dom';
import { Heart, Lock, Euro, Zap } from 'lucide-react';
import { Button }       from '@/components/ui/Button';
import { ProgressBar }  from '@/components/ui/ProgressBar';
import { Input }        from '@/components/ui/Input';
import { cn }           from '@/lib/utils/cn';

interface AssetInvestBoxProps {
  assetId:         string;
  cellUnitPrice:   number;
  totalCells:      number;
  cellsSubscribed: number;
  targetYieldRate: number;
  status:          string;
}

const PRESETS = [10, 50, 100] as const;

export function AssetInvestBox({
  assetId,
  cellUnitPrice,
  totalCells,
  cellsSubscribed,
  targetYieldRate,
  status,
}: AssetInvestBoxProps) {
  const [amount, setAmount]     = useState<number | ''>('');
  const [favorite, setFavorite] = useState(false);

  const canInvest = status === 'financing';
  const pct       = Math.round((cellsSubscribed / totalCells) * 100);
  const remaining = totalCells - cellsSubscribed;
  const cellsToReceive = amount ? Math.floor(Number(amount) / cellUnitPrice) : 0;

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card-md sticky top-20 flex flex-col gap-4">
      <h2 className="text-base font-bold text-ink-900">Investir dans cet actif</h2>

      {/* Prix unitaire */}
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-ink-500">Prix d'un Solar Cell Token</span>
        <span className="text-2xl font-bold text-ink-950 tabular-nums">
          {cellUnitPrice.toFixed(2)} €
        </span>
      </div>

      {/* Progression */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-ink-500">
          <span>Tokens disponibles</span>
          <span className="font-semibold text-ink-700">
            {remaining.toLocaleString('fr-FR')} / {totalCells.toLocaleString('fr-FR')}
          </span>
        </div>
        <ProgressBar value={pct} tone={canInvest ? 'warning' : 'success'} height="md" />
        <p className="text-xs text-ink-400 text-right">{pct}%</p>
      </div>

      {/* Rendement cible */}
      <div className="flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2">
        <span className="text-xs font-medium text-primary-700">Rendement cible (estimé)</span>
        <span className="text-base font-bold text-primary-800">
          {(targetYieldRate * 100).toFixed(1)}% / an
        </span>
      </div>

      {/* Sélecteur de montant */}
      {canInvest ? (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-ink-700">Montant à investir</p>
            {/* Presets */}
            <div className="flex gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(p)}
                  className={cn(
                    'flex-1 rounded-lg border py-2 text-sm font-semibold transition-all',
                    amount === p
                      ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                      : 'border-ink-200 text-ink-700 hover:border-primary-300 hover:bg-primary-50',
                  )}
                >
                  {p} €
                </button>
              ))}
              <button
                onClick={() => setAmount('')}
                className={cn(
                  'flex-1 rounded-lg border py-2 text-xs font-semibold transition-all',
                  typeof amount === 'number' && !PRESETS.includes(amount as typeof PRESETS[number])
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-ink-200 text-ink-500 hover:border-ink-300',
                )}
              >
                Autre
              </button>
            </div>
            {/* Input libre */}
            {!PRESETS.includes(amount as typeof PRESETS[number]) && (
              <Input
                type="number"
                placeholder="150"
                min={1}
                iconLeft={<Euro className="h-4 w-4" aria-hidden />}
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
              />
            )}
          </div>

          {/* Tokens reçus */}
          {cellsToReceive > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
              <span className="text-xs text-ink-500">Vous recevrez ≈</span>
              <span className="text-sm font-bold text-primary-700">
                {cellsToReceive.toLocaleString('fr-FR')} SCT
              </span>
            </div>
          )}

          {/* CTA */}
          {amount ? (
            <Button asChild fullWidth size="lg">
              <Link to={`/investir/${assetId}/montant?amount=${amount}`}>
                Investir maintenant →
              </Link>
            </Button>
          ) : (
            <Button fullWidth size="lg" disabled>
              Investir maintenant →
            </Button>
          )}
        </>
      ) : (
        <div className="rounded-lg bg-ink-50 px-3 py-3 text-center">
          <p className="text-xs text-ink-500">
            {status === 'in_production'
              ? 'Cet actif est en production. Disponible sur le marché secondaire.'
              : status === 'coming_soon'
                ? 'Cet actif sera bientôt disponible.'
                : 'Financement complet.'}
          </p>
        </div>
      )}

      {/* Favori */}
      <button
        onClick={() => setFavorite((f) => !f)}
        className="flex items-center justify-center gap-2 text-sm text-ink-500 hover:text-ink-800 transition-colors"
      >
        <Heart
          className={cn('h-4 w-4', favorite && 'fill-red-500 text-red-500')}
          aria-hidden
        />
        {favorite ? 'Retiré des favoris' : 'Ajouter aux favoris'}
      </button>

      {/* Trust */}
      <div className="flex items-center gap-1.5 justify-center text-xs text-ink-400">
        <Lock className="h-3.5 w-3.5" aria-hidden />
        Investissement sécurisé et réglementé
      </div>
    </div>
  );
}
