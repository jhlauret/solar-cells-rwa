import { Heart, Zap, Euro, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge }       from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button }      from '@/components/ui/Button';
import { cn }          from '@/lib/utils/cn';
import { type Asset, getFinancingPct } from '@/features/marketplace/mock/assets.mock';

// ─── Config statuts ────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  in_production:     { label: 'En production',      tone: 'success'  as const, progressTone: 'success' as const },
  financing:         { label: 'Financement en cours',tone: 'warning'  as const, progressTone: 'warning' as const },
  financing_complete:{ label: 'Financement complet', tone: 'info'     as const, progressTone: 'success' as const },
  coming_soon:       { label: 'À venir',             tone: 'muted'    as const, progressTone: 'muted'   as const },
  cancelled:         { label: 'Annulé',              tone: 'danger'   as const, progressTone: 'muted'   as const },
};

interface AssetCardProps {
  asset:      Asset;
  onFavorite?: (id: string) => void;
  className?: string;
}

export function AssetCard({ asset, onFavorite, className }: AssetCardProps) {
  const config  = STATUS_CONFIG[asset.status];
  const pct     = getFinancingPct(asset);
  const remaining = asset.totalCells - asset.cellsSubscribed;
  const canInvest = asset.status === 'financing';

  return (
    <article
      className={cn(
        'flex flex-col rounded-2xl bg-white border border-ink-200',
        'shadow-card hover:shadow-card-md transition-all duration-200',
        'overflow-hidden group',
        className,
      )}
    >
      {/* Image */}
      <div className="relative aspect-video bg-ink-100 overflow-hidden">
        {asset.imageUrl ? (
          <img
            src={asset.imageUrl}
            alt={asset.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-100 to-ink-100">
            <Zap className="h-12 w-12 text-primary-300" />
          </div>
        )}

        {/* Badge statut */}
        <div className="absolute top-2.5 left-2.5">
          <Badge tone={config.tone} dot className="text-[11px] font-bold tracking-wide uppercase shadow-sm">
            {config.label}
          </Badge>
        </div>

        {/* Favori */}
        <button
          onClick={() => onFavorite?.(asset.id)}
          className={cn(
            'absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center',
            'rounded-full bg-white/90 shadow-sm backdrop-blur-sm',
            'hover:bg-white transition-colors',
          )}
          aria-label={asset.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart
            className={cn('h-4 w-4 transition-colors', asset.isFavorite ? 'fill-red-500 text-red-500' : 'text-ink-400')}
            aria-hidden
          />
        </button>
      </div>

      {/* Corps */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Localisation + Nom */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-1">
            <span>{asset.countryCode === 'FR' ? '🇫🇷' : '🇨🇭'}</span>
            <span>{asset.countryName}</span>
            <span>•</span>
            <span className="truncate">{asset.region}</span>
          </div>
          <h3 className="font-semibold text-ink-900 text-sm leading-snug line-clamp-2">
            {asset.name}
          </h3>
        </div>

        {/* Métriques */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="flex items-center justify-center gap-0.5 text-sm font-bold text-ink-900 tabular-nums">
              <Zap className="h-3 w-3 text-primary-500 shrink-0" aria-hidden />
              {asset.installedPower}
            </div>
            <p className="text-[10px] text-ink-400">Puissance</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-0.5 text-sm font-bold text-primary-700 tabular-nums">
              <BarChart2 className="h-3 w-3 shrink-0" aria-hidden />
              {(asset.targetYieldRate * 100).toFixed(1)}%
            </div>
            <p className="text-[10px] text-ink-400">Rendement cible</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-0.5 text-sm font-bold text-ink-900 tabular-nums">
              <Euro className="h-3 w-3 text-ink-400 shrink-0" aria-hidden />
              {asset.cellUnitPrice.toFixed(2)}
            </div>
            <p className="text-[10px] text-ink-400">Prix / Solar Cell</p>
          </div>
        </div>

        {/* Barre de financement */}
        <div className="flex flex-col gap-1.5">
          <ProgressBar value={pct} tone={config.progressTone} height="sm" />
          <div className="flex justify-between text-[10px] text-ink-400">
            <span className="font-medium text-ink-600">{pct}% des Solar Cells vendues</span>
            <span>{remaining.toLocaleString('fr-FR')}/{asset.totalCells.toLocaleString('fr-FR')} restantes</span>
          </div>
        </div>

        {/* CTA */}
        {canInvest ? (
          <Button
            asChild
            size="sm"
            fullWidth
          >
            <Link to={`/actifs/${asset.slug}`}>Voir le détail</Link>
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            className={
              asset.status === 'in_production'
                ? 'border-status-success text-status-success hover:bg-status-success-bg'
                : ''
            }
          >
            Voir le détail
          </Button>
        )}
      </div>
    </article>
  );
}
