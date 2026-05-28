import { useState } from 'react';
import { Link }       from 'react-router-dom';
import { TrendingUp, Zap, Euro, ExternalLink } from 'lucide-react';
import { Badge }       from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button }      from '@/components/ui/Button';
import { Spinner }     from '@/components/ui/Spinner';
import { usePortfolio, type HoldingSummary } from '@/hooks/useDashboard';

const TABS = ['Tous les actifs', 'En production', 'Financement en cours', 'Cessions'] as const;
type Tab = typeof TABS[number];

const STATUS_CFG: Record<string, { label: string; tone: 'success' | 'warning' | 'muted' }> = {
  in_production:     { label: 'En production',        tone: 'success' },
  financing:         { label: 'Financement en cours', tone: 'warning' },
  financing_complete:{ label: 'Financement complet',  tone: 'success' },
  paused:            { label: 'Pausé',                tone: 'muted'   },
};

export function PortfolioPage() {
  const [tab, setTab] = useState<Tab>('Tous les actifs');
  const { data: holdings = [], isLoading } = usePortfolio();

  const displayed = holdings.filter((h: HoldingSummary) => {
    if (tab === 'Tous les actifs') return true;
    if (tab === 'En production')         return h.asset_state === 'in_production';
    if (tab === 'Financement en cours')  return h.asset_state === 'financing';
    return false;
  });

  const totalValue   = holdings.reduce((s: number, h: HoldingSummary) => s + (h.current_value ?? 0), 0);
  const totalYield   = holdings.reduce((s: number, h: HoldingSummary) => s + (h.total_yield_received ?? 0), 0);
  const avgYield     = holdings.length > 0
    ? holdings.reduce((s: number, h: HoldingSummary) => s + ((h.total_yield_received ?? 0) / Math.max(h.total_invested ?? 1, 1)), 0) / holdings.length * 100
    : 0;

  return (
    <div className="container-content py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-950">Mon portefeuille</h1>
          <p className="text-sm text-ink-500 mt-0.5">Gérez vos Solar Cells et suivez vos rendements.</p>
        </div>
        <Button asChild><Link to="/actifs">Investir dans un nouvel actif</Link></Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Valeur totale',      value: `${totalValue.toLocaleString('fr-FR')} €`,  icon: Zap },
          { label: 'Revenus perçus',     value: `${totalYield.toFixed(2)} €`,                icon: Euro },
          { label: 'Rendement moyen',    value: `${avgYield.toFixed(1)}% / an`,             icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl bg-white border border-ink-200 shadow-card px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3.5 w-3.5 text-primary-500" aria-hidden />
              <p className="text-xs text-ink-500">{label}</p>
            </div>
            <p className="text-lg font-bold text-ink-950 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-ink-200 mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table des holdings */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : displayed.length === 0 ? (
          <div className="rounded-xl bg-white border border-ink-200 p-8 text-center">
            <p className="text-ink-400 text-sm">Aucun actif dans ce portefeuille.</p>
          </div>
        ) : displayed.map((h: HoldingSummary) => {
          const statusCfg = STATUS_CFG[h.asset_state] ?? { label: h.asset_state, tone: 'muted' as const };
          const yieldRate = h.total_invested > 0
            ? ((h.total_yield_received / h.total_invested) * 100).toFixed(1)
            : '—';
          return (
          <div key={h.uuid} className="rounded-xl bg-white border border-ink-200 shadow-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-ink-950">{h.asset_name}</h3>
                  <Badge tone={statusCfg.tone} dot className="text-[10px]">
                    {statusCfg.label}
                  </Badge>
                </div>
                <p className="text-xs text-ink-400 mt-0.5">{h.asset_code}</p>
              </div>

              <div className="grid grid-cols-4 gap-6 text-sm">
                {[
                  { label: 'Solar Cells',     value: (h.cells_owned ?? 0).toLocaleString('fr-FR') + ' SCT' },
                  { label: 'Valeur',          value: (h.current_value ?? 0).toLocaleString('fr-FR') + ' €' },
                  { label: 'Rendement',       value: yieldRate + (yieldRate !== '—' ? '% / an' : ''), highlight: true },
                  { label: 'Revenus perçus',  value: (h.total_yield_received ?? 0).toFixed(2) + ' €' },
                ].map(({ label, value, highlight }) => (
                  <div key={label}>
                    <p className="text-xs text-ink-400 mb-0.5">{label}</p>
                    <p className={`font-bold tabular-nums ${highlight ? 'text-primary-700' : 'text-ink-900'}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-ink-400">
                {h.first_acquired_at && <>Depuis le <span className="font-medium text-ink-700">{new Date(h.first_acquired_at).toLocaleDateString('fr-FR')}</span></>}
              </p>
              <Link to={`/actifs/${h.asset_uuid}`} className="flex items-center gap-1 text-xs font-semibold text-primary-700 no-underline hover:text-primary-800">
                Voir l'actif <ExternalLink className="h-3 w-3" aria-hidden />
              </Link>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
