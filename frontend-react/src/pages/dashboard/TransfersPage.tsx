import { useState } from 'react';
import { Plus, ArrowUpRight, Clock, CheckCircle } from 'lucide-react';
import { Badge }      from '@/components/ui/Badge';
import { Button }     from '@/components/ui/Button';
import { ProgressBar }from '@/components/ui/ProgressBar';
import { Spinner }    from '@/components/ui/Spinner';
import {
  usePublishedMarketOrders, useMyMarketOrders, useTransactionHistory,
  type MarketOrder, type Transaction,
} from '@/hooks/useDashboard';

const STATUS_TONE: Record<string, 'success' | 'info' | 'muted' | 'danger'> = {
  published: 'success', partial: 'info', filled: 'muted',
  cancelled: 'muted',   expired: 'danger',
};

export function TransfersPage() {
  const [tab, setTab] = useState<'buy' | 'sell' | 'history'>('buy');

  const { data: publicOrders = [], isLoading: loadingPublic }  = usePublishedMarketOrders();
  const { data: myOrders     = [], isLoading: loadingMine }    = useMyMarketOrders();
  const { data: txHistory    = [], isLoading: loadingHistory } = useTransactionHistory();

  return (
    <div className="container-content py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-950">Transferts & Marché secondaire</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Achetez ou vendez des Solar Cells entre membres vérifiés.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-1" aria-hidden />
          Créer une offre de cession
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-ink-200 w-fit mb-6">
        {([
          { id: 'buy',     label: '🛒 Acheter'           },
          { id: 'sell',    label: '💰 Mes offres'        },
          { id: 'history', label: '📋 Historique'         },
        ] as const).map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === id ? 'bg-primary-600 text-white' : 'bg-white text-ink-600 hover:bg-ink-50'
            }`}>{label}</button>
        ))}
      </div>

      {/* ── Offres disponibles ──────────────────────────────────────────── */}
      {tab === 'buy' && (
        <div className="flex flex-col gap-4">
          {loadingPublic ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : publicOrders.length === 0 ? (
            <div className="rounded-xl bg-white border border-dashed border-ink-200 p-8 text-center">
              <p className="text-ink-400 text-sm">Aucune offre disponible pour le moment.</p>
            </div>
          ) : publicOrders.map((order: MarketOrder, i: number) => {
            const assetName = Array.isArray(order.asset_id) ? order.asset_id[1] : String(order.asset_id);
            return (
            <div key={i} className="rounded-xl bg-white border border-ink-200 shadow-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-ink-950">{assetName}</h3>
                  <p className="text-xs text-ink-400 mt-0.5">Vendeur vérifié</p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-6 text-sm">
                  {[
                    { label: 'Prix / SCT',  value: `${order.price_per_cell?.toFixed(2)} €` },
                    { label: 'Disponible',  value: `${order.cells_remaining} SCT` },
                    { label: 'Total max',   value: `${(order.cells_offered * order.price_per_cell)?.toFixed(2)} €` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-ink-400">{label}</p>
                      <p className="font-bold text-ink-900">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                  <CheckCircle className="h-3.5 w-3.5 text-status-success" />
                  Membre vérifié KYC · Transfert sécurisé
                </div>
                <Button size="sm">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Acheter ces Solar Cells
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* ── Mes offres ──────────────────────────────────────────────────── */}
      {tab === 'sell' && (
        <div className="flex flex-col gap-4">
          {loadingMine ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : myOrders.length === 0 ? (
            <div className="rounded-xl bg-white border border-dashed border-ink-200 p-8 text-center">
              <p className="text-ink-400 text-sm">Vous n'avez pas encore d'offre active.</p>
              <Button className="mt-4" size="sm">Créer une offre</Button>
            </div>
          ) : myOrders.map((order: MarketOrder, i: number) => {
            const assetName = Array.isArray(order.asset_id) ? order.asset_id[1] : String(order.asset_id);
            const pct = order.cells_offered > 0
              ? Math.round(((order.cells_offered - order.cells_remaining) / order.cells_offered) * 100)
              : 0;
            return (
            <div key={i} className="rounded-xl bg-white border border-ink-200 shadow-card p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-ink-950">{assetName}</h3>
                  <p className="text-xs text-ink-400 mt-0.5">
                    {order.cells_offered} SCT · {order.price_per_cell?.toFixed(2)} €/SCT
                  </p>
                </div>
                <Badge tone={STATUS_TONE[order.state] ?? 'muted'}>{order.state}</Badge>
              </div>
              <ProgressBar value={pct} tone="success" height="sm" />
              <div className="mt-2 flex items-center justify-between text-xs text-ink-400">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expire le {order.expires_at ? new Date(order.expires_at).toLocaleDateString('fr-FR') : '—'}
                </div>
                <span>{order.cells_remaining} SCT restantes</span>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* ── Historique transactions ─────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="flex flex-col gap-3">
          {loadingHistory ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : txHistory.length === 0 ? (
            <div className="text-center py-10 text-ink-400 text-sm">Aucune transaction.</div>
          ) : txHistory.map((tx: Transaction, i: number) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-ink-200 shadow-card">
              <div>
                <p className="text-sm font-semibold text-ink-900">{tx.name}</p>
                <p className="text-xs text-ink-400 mt-0.5">
                  {tx.transaction_type} · {tx.payment_method} · {new Date(tx.initiated_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold tabular-nums ${
                  tx.direction === 'inbound' ? 'text-status-success' : 'text-ink-700'
                }`}>
                  {tx.direction === 'inbound' ? '+' : '-'}{(tx.net_amount ?? 0).toFixed(2)} €
                </p>
                <Badge tone={tx.state === 'succeeded' ? 'success' : tx.state === 'failed' ? 'danger' : 'info'} className="text-[10px]">
                  {tx.state}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
