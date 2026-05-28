import { Link }         from 'react-router-dom';
import { TrendingUp, BarChart2, Euro, Zap, ArrowRight, Clock } from 'lucide-react';
import { Badge }        from '@/components/ui/Badge';
import { ProgressBar }  from '@/components/ui/ProgressBar';
import { Button }       from '@/components/ui/Button';
import { Spinner }      from '@/components/ui/Spinner';
import { usePortfolio, useTransactionHistory } from '@/hooks/useDashboard';
import { useAuth }      from '@/contexts/AuthContext';

export function DashboardPage() {
  const { user }     = useAuth();
  const { data: holdings = [], isLoading: loadingPortfolio } = usePortfolio();
  const { data: transactions = [] } = useTransactionHistory();

  const firstName = user?.email?.split('@')[0] ?? 'investisseur';

  const totalValue   = holdings.reduce((s, h) => s + (h.current_value ?? 0), 0);
  const totalYield   = holdings.reduce((s, h) => s + (h.total_yield_received ?? 0), 0);
  const totalInvested = holdings.reduce((s, h) => s + (h.total_invested ?? 0), 0);
  const gain = totalValue > 0 ? ((totalValue - totalInvested) / totalInvested * 100).toFixed(1) : '0';

  const PORTFOLIO_STATS = [
    { label: 'Valeur totale du portefeuille', value: `${totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, sub: `+${gain}% depuis l'investissement`, icon: TrendingUp, positive: true },
    { label: 'Revenus perçus',               value: `${totalYield.toFixed(2)} €`,   sub: 'Depuis le début',  icon: Euro,       positive: true },
    { label: 'Actifs en portefeuille',        value: `${holdings.filter(h => h.state === 'active').length}`, sub: 'Positions actives', icon: BarChart2, positive: null },
    { label: 'Solar Cells détenues',          value: `${holdings.reduce((s, h) => s + (h.cells_owned ?? 0), 0).toLocaleString('fr-FR')} SCT`, sub: `Sur ${holdings.length} actifs`, icon: Zap, positive: null },
  ] as const;

  const STATUS_CFG: Record<string, { label: string; tone: 'success' | 'warning' }> = {
    in_production:     { label: 'En production',       tone: 'success' },
    financing:         { label: 'Financement en cours', tone: 'warning' },
    financing_complete:{ label: 'Financement complet',  tone: 'success' },
  };

  return (
    <div className="container-content py-6 flex flex-col gap-6">
      {/* Bienvenue */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-950">Bonjour, {firstName} 👋</h1>
          <p className="text-sm text-ink-500 mt-0.5">Voici l'aperçu de votre portefeuille SolarCells.</p>
        </div>
        <Button asChild>
          <Link to="/actifs">Investir dans un nouvel actif</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {PORTFOLIO_STATS.map(({ label, value, sub, icon: Icon, positive }) => (
          <div key={label} className="rounded-2xl bg-white border border-ink-200 shadow-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-ink-500">{label}</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                <Icon className="h-4 w-4 text-primary-600" aria-hidden />
              </div>
            </div>
            <p className="text-xl font-bold text-ink-950 tabular-nums">{value}</p>
            {sub && (
              <p className={`mt-1 text-xs font-medium ${positive ? 'text-status-success' : 'text-ink-400'}`}>
                {positive ? '↑ ' : ''}{sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Corps 2 colonnes */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Mes actifs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-ink-900">Mes actifs</h2>
            <Link to="/portefeuille" className="text-sm font-semibold text-primary-700 no-underline hover:text-primary-800 flex items-center gap-1">
              Voir tout <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {loadingPortfolio ? (
              <div className="flex justify-center py-8"><Spinner size="sm" /></div>
            ) : holdings.slice(0, 3).map((h) => (
              <div key={h.uuid} className="rounded-xl bg-white border border-ink-200 shadow-card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{h.asset_name}</p>
                    <p className="text-xs text-ink-400 mt-0.5">{(h.cells_owned ?? 0).toLocaleString('fr-FR')} Solar Cells · {(h.current_value ?? 0).toLocaleString('fr-FR')} €</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={h.asset_state === 'in_production' ? 'success' : 'warning'} dot className="text-[10px] shrink-0">
                      {h.asset_state === 'in_production' ? 'En production' : 'Financement'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-ink-500">
                  <Clock className="h-3 w-3 shrink-0" aria-hidden />
                  {h.first_acquired_at
                    ? <>Depuis le <span className="font-medium text-ink-700 ml-1">{new Date(h.first_acquired_at).toLocaleDateString('fr-FR')}</span></>
                    : 'En cours'
                  }
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* Activité récente */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-ink-900">Activité récente</h2>
          </div>
          <div className="rounded-xl bg-white border border-ink-200 shadow-card divide-y divide-ink-100">
            {transactions.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-ink-400">Aucune activité pour le moment.</div>
            ) : transactions.slice(0, 5).map((tx, i) => (
              <div key={i} className="flex items-start justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-ink-900">{tx.transaction_type}</p>
                  <p className="text-[10px] text-ink-400">
                    {tx.name} · {tx.initiated_at ? new Date(tx.initiated_at).toLocaleDateString('fr-FR') : ''}
                  </p>
                </div>
                <span className={`text-xs font-bold tabular-nums ${tx.direction === 'inbound' ? 'text-status-success' : 'text-ink-700'}`}>
                  {tx.direction === 'inbound' ? '+' : '-'}{(tx.net_amount ?? 0).toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
