import { Euro, Calendar, TrendingUp } from 'lucide-react';
import { Badge }   from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useYield, type YieldLine } from '@/hooks/useDashboard';

const STATUS_CFG: Record<string, { label: string; tone: 'success' | 'info' | 'muted' }> = {
  paid:     { label: 'Versé',      tone: 'success' },
  pending:  { label: 'En attente', tone: 'info'    },
  failed:   { label: 'Échoué',     tone: 'muted'   },
};

export function YieldPage() {
  const { data: lines = [], isLoading } = useYield();

  const totalReceived  = lines.reduce((s: number, l: YieldLine) => s + (l.amount_net  ?? 0), 0);
  const pendingAmount  = lines.filter((l: YieldLine) => l.state === 'pending')
                              .reduce((s: number, l: YieldLine) => s + (l.amount_gross ?? 0), 0);

  return (
    <div className="container-content py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-950">Mes revenus</h1>
        <p className="text-sm text-ink-500 mt-0.5">
          Historique de vos distributions de revenus et estimations à venir.
        </p>
      </div>

      {/* Cards résumé */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Revenus totaux perçus',     value: `${totalReceived.toFixed(2)} €`,  icon: Euro },
          { label: 'Prochains versements',       value: pendingAmount > 0 ? `~${pendingAmount.toFixed(2)} €` : '—', icon: TrendingUp },
          { label: 'Lignes de distribution',     value: `${lines.length}`, icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl bg-white border border-ink-200 shadow-card px-4 py-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3.5 w-3.5 text-primary-500" aria-hidden />
              <p className="text-xs text-ink-500">{label}</p>
            </div>
            <p className="text-xl font-bold text-ink-950 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="rounded-2xl bg-white border border-ink-200 shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <h2 className="text-sm font-semibold text-ink-900">Historique des distributions</h2>
          <button className="text-xs font-semibold text-primary-700 hover:text-primary-800">
            Exporter CSV
          </button>
        </div>

        <div className="grid grid-cols-5 gap-4 px-5 py-3 bg-ink-50 text-[10px] font-bold text-ink-400 uppercase tracking-wide border-b border-ink-100">
          <span className="col-span-2">Actif / Période</span>
          <span>Date</span>
          <span>Solar Cells</span>
          <span className="text-right">Montant</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : lines.length === 0 ? (
          <div className="px-5 py-10 text-center text-ink-400 text-sm">
            Aucune distribution pour le moment.
          </div>
        ) : lines.map((line: YieldLine, i: number) => {
          const cfg    = STATUS_CFG[line.state] ?? { label: line.state, tone: 'muted' as const };
          const assetName = Array.isArray(line.asset_id) ? line.asset_id[1] : String(line.asset_id);
          const distName  = Array.isArray(line.distribution_id) ? line.distribution_id[1] : '';
          return (
            <div key={i} className="grid grid-cols-5 gap-4 items-center px-5 py-3.5 border-b border-ink-100 last:border-0 hover:bg-ink-50 transition-colors">
              <div className="col-span-2">
                <p className="text-sm font-medium text-ink-900">{assetName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge tone={cfg.tone} className="text-[10px]">{cfg.label}</Badge>
                  <span className="text-[10px] text-ink-400">{distName}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-ink-500">
                <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {line.paid_at ? new Date(line.paid_at).toLocaleDateString('fr-FR') : '—'}
              </div>
              <p className="text-xs font-medium text-ink-700 tabular-nums">
                {(line.cells_at_distribution ?? 0).toLocaleString('fr-FR')} SCT
              </p>
              <p className={`text-sm font-bold tabular-nums text-right ${line.state === 'paid' ? 'text-status-success' : 'text-ink-400'}`}>
                {line.state === 'paid' ? '+' : '~'}{(line.amount_net ?? 0).toFixed(2)} €
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl bg-ink-50 border border-ink-200 px-4 py-3">
        <div className="flex items-start gap-2">
          <Euro className="h-4 w-4 shrink-0 text-ink-500 mt-0.5" aria-hidden />
          <p className="text-xs text-ink-500 leading-relaxed">
            Les revenus distribués sont soumis à l'imposition en vigueur dans votre pays de résidence.
            Un justificatif fiscal annuel est disponible dans votre espace personnel.
          </p>
        </div>
      </div>
    </div>
  );
}
