import { useState, useMemo } from 'react';
import { LayoutGrid, List, Zap, BarChart2, Users, Euro } from 'lucide-react';
import { AssetCard }    from '@/features/marketplace/components/AssetCard/AssetCard';
import { AssetFilters, type AssetFiltersState }
  from '@/features/marketplace/components/AssetFilters/AssetFilters';
import { type Asset }  from '@/features/marketplace/mock/assets.mock';
import { useAssets }   from '@/hooks/useAssets';
import { Select }      from '@/components/ui/Select';
import { Spinner }     from '@/components/ui/Spinner';
import { cn }          from '@/lib/utils/cn';

const GLOBAL_STATS = [
  { icon: LayoutGrid, value: '12 450', label: 'Actifs financés'   },
  { icon: Zap,        value: '28,7 GWh',label: 'Énergie produite' },
  { icon: Euro,       value: '8,42 %',  label: 'Rendement moyen'  },
  { icon: Users,      value: '3 245',   label: 'Investisseurs'     },
] as const;

const SORT_OPTIONS = [
  { value: 'yield_desc', label: 'Rendement (décroissant)' },
  { value: 'yield_asc',  label: 'Rendement (croissant)'   },
  { value: 'name_asc',   label: 'Nom (A–Z)'               },
];

export function MarketplacePage() {
  const [view, setView]       = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy]   = useState('yield_desc');
  const [filters, setFilters] = useState<AssetFiltersState | null>(null);

  const { data: assets = [], isLoading, isError } = useAssets();

  // Filtrage + tri des actifs
  const displayed = useMemo(() => {
    let list = [...assets] as Asset[];
    if (filters) {
      if (filters.country) list = list.filter((a) => a.countryCode === filters.country);
      if (filters.types.length) list = list.filter((a) => filters.types.includes(a.assetType));
      if (filters.status) list = list.filter((a) => a.status === filters.status);
      list = list.filter((a) => (a.targetYieldRate * 100) <= filters.maxYield);
    }
    if (sortBy === 'yield_desc') list.sort((a, b) => b.targetYieldRate - a.targetYieldRate);
    if (sortBy === 'yield_asc')  list.sort((a, b) => a.targetYieldRate - b.targetYieldRate);
    if (sortBy === 'name_asc')   list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [filters, sortBy]);

  return (
    <div>
      {/* ── En-tête de page ─────────────────────────────────────────── */}
      <div className="border-b border-ink-200 bg-white">
        <div className="container-content py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ink-950">
                Marketplace des actifs solaires
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                Découvrez et investissez dans des installations solaires réelles,
                tokenisées en Solar Cells.
              </p>
            </div>
            {/* Stats bar */}
            <div className="flex flex-wrap gap-6">
              {GLOBAL_STATS.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary-500 shrink-0" aria-hidden />
                  <div>
                    <p className="text-base font-bold text-ink-900 tabular-nums leading-none">
                      {value}
                    </p>
                    <p className="text-[10px] text-ink-400">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Corps en 2 colonnes ─────────────────────────────────────── */}
      <div className="container-content py-6">
        <div className="grid lg:grid-cols-[256px_1fr] gap-6 items-start">
          {/* Filtres */}
          <div className="hidden lg:block">
            <AssetFilters onChange={setFilters} />
          </div>

          {/* Résultats */}
          <div className="flex flex-col gap-4">
            {/* Barre de résultats */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm font-medium text-ink-700">
                <span className="font-bold text-ink-950">{displayed.length}</span> actifs disponibles
              </p>
              <div className="flex items-center gap-3">
                {/* Toggle vue */}
                <div className="flex rounded-lg border border-ink-200 overflow-hidden">
                  {([
                    { v: 'grid' as const, Icon: LayoutGrid },
                    { v: 'list' as const, Icon: List },
                  ]).map(({ v, Icon }) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={cn(
                        'p-2 transition-colors',
                        view === v ? 'bg-primary-600 text-white' : 'text-ink-400 hover:bg-ink-50',
                      )}
                      aria-label={v === 'grid' ? 'Vue grille' : 'Vue liste'}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </button>
                  ))}
                </div>
                {/* Tri */}
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  options={SORT_OPTIONS}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Grille */}
            <div
              className={cn(
                view === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4'
                  : 'flex flex-col gap-3',
              )}
            >
              {isLoading ? (
                <div className="col-span-full py-16 flex justify-center">
                  <Spinner size="lg" />
                </div>
              ) : isError ? (
                <div className="col-span-full py-16 text-center">
                  <p className="text-status-danger text-sm">
                    Impossible de charger les actifs. Vérifiez votre connexion.
                  </p>
                </div>
              ) : displayed.length === 0 ? (
                <div className="col-span-full py-16 text-center">
                  <p className="text-ink-400 text-sm">
                    Aucun actif ne correspond à ces critères.
                  </p>
                </div>
              ) : (
                displayed.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    className={view === 'list' ? 'flex-row' : ''}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer features ─────────────────────────────────────────── */}
      <div className="border-t border-ink-200 bg-white py-6">
        <div className="container-content">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { emoji:'🛡️', label:'Actifs réels & vérifiés',      desc:'Chaque installation est auditée et documentée' },
              { emoji:'📄', label:'Documentation complète',        desc:'Accédez à tous les documents légaux et techniques' },
              { emoji:'🔒', label:'Transferts sécurisés',          desc:'Échanges uniquement entre membres vérifiés' },
              { emoji:'📈', label:'Rendement transparent',         desc:'Suivi en temps réel de la production et des revenus' },
              { emoji:'🌱', label:'Impact positif',                desc:'Contribuez à la transition énergétique' },
            ].map(({ emoji, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="text-xl">{emoji}</span>
                <div>
                  <p className="text-xs font-semibold text-ink-800">{label}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
