import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Zap, Calendar, Clock, CheckCircle } from 'lucide-react';
import { Badge }           from '@/components/ui/Badge';
import { Tag }             from '@/components/ui/Tag';
import { Tabs }            from '@/components/ui/Tabs';
import { Button }          from '@/components/ui/Button';
import { Spinner }         from '@/components/ui/Spinner';
import { AssetInvestBox }  from '@/features/asset/components/AssetInvestBox/AssetInvestBox';
import { DonutChart }      from '@/features/asset/components/DonutChart/DonutChart';
import { SimpleBarChart, MOCK_PERFORMANCE_DATA }
  from '@/features/asset/components/SimpleBarChart/SimpleBarChart';
import { useAsset }        from '@/hooks/useAssets';

// ─── Données mock — Centrale de Provence (PDF p.9) ────────────────────────
const ASSET = {
  id:              'asset-provence-001',
  name:            'Centrale solaire de Provence',
  location:        'Manosque, Provence-Alpes-Côte d\'Azur',
  countryCode:     'FR',
  status:          'financing' as const,
  description:     'Parc solaire au sol de 5 MWc situé à Manosque. L\'actif bénéficie d\'un contrat de vente d\'électricité de 20 ans et d\'une technologie de panneaux haut rendement.',
  installedPower:  '5 MWc',
  annualProduction:'6 250 MWh',
  commissioningDate:'Juin 2024',
  projectDuration: '20 ans',
  cellUnitPrice:   1.00,
  totalCells:      5_000_000,
  cellsSubscribed: 2_450_000,
  targetYieldRate: 0.085,
  tags: ['Énergie solaire', 'Actif réel', 'Assuré', 'Contrat de vente 20 ans'],
  keyInfo: [
    { label: 'Propriétaire de l\'actif', value: 'Solar Assets SAS'       },
    { label: 'Exploitant',               value: 'SunOps France'           },
    { label: 'Contrat de vente',         value: 'EDF OA – 20 ans'        },
    { label: 'Tarif de rachat',          value: '0,095 €/kWh'            },
    { label: 'Assurance',                value: 'Tous risques – AXA'      },
    { label: 'Maintenance',              value: 'Incluse – 20 ans'        },
  ],
  overview: [
    { label: 'Rendement cible (IRR)',    value: '8,5 % / an'             },
    { label: 'Distribution des revenus',value: 'Trimestrielle'           },
    { label: 'Durée du projet',         value: '20 ans'                  },
    { label: 'Période de blocage',      value: 'Aucune'                  },
    { label: 'Rachat possible',         value: 'Marché secondaire privé' },
  ],
};

// ─── Onglet Aperçu ────────────────────────────────────────────────────────
function AperturePanel() {
  const [chartMode, setChartMode] = useState<'production' | 'revenue'>('production');

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Gauche — métriques */}
      <div>
        <h3 className="text-sm font-semibold text-ink-700 mb-4">Aperçu de l'investissement</h3>
        <div className="flex items-start gap-6">
          <DonutChart
            value={8.5}
            label="8,5%"
            sublabel="Rendement cible par an"
            size={128}
            stroke={14}
          />
          <ul className="flex flex-col gap-2 flex-1">
            {ASSET.overview.map(({ label, value }) => (
              <li key={label} className="flex justify-between text-xs">
                <span className="text-ink-500">{label}</span>
                <span className="font-semibold text-ink-800">{value}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-4 text-[10px] text-ink-400 leading-relaxed">
          Objectif de rendement net de frais. Les performances passées ne présagent pas des performances futures.
        </p>
      </div>

      {/* Droite — graphique */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ink-700">Performance estimée</h3>
          <div className="flex rounded-lg border border-ink-200 overflow-hidden text-xs">
            {(['production', 'revenue'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setChartMode(m)}
                className={
                  chartMode === m
                    ? 'bg-primary-600 text-white px-3 py-1.5 font-medium'
                    : 'text-ink-500 px-3 py-1.5 hover:bg-ink-50'
                }
              >
                {m === 'production' ? 'Production (MWh)' : 'Rendement (€)'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto pb-2">
          <SimpleBarChart data={MOCK_PERFORMANCE_DATA} mode={chartMode} />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-400">
          <Zap className="h-3.5 w-3.5 text-primary-500 shrink-0" aria-hidden />
          Production annuelle moyenne estimée : 6 250 MWh — données basées sur les simulations PVSyst et l'irradiation locale.
        </p>
      </div>
    </div>
  );
}

// ─── Onglet Informations clés (commun à plusieurs onglets) ────────────────
function KeyInfoTable() {
  return (
    <div className="mt-6 rounded-xl border border-ink-200 overflow-hidden">
      <p className="px-5 py-3 bg-ink-50 text-sm font-semibold text-ink-700 border-b border-ink-200">
        Informations clés
      </p>
      <dl className="divide-y divide-ink-100">
        {ASSET.keyInfo.map(({ label, value }) => (
          <div key={label} className="flex justify-between px-5 py-3">
            <dt className="text-xs text-ink-500">{label}</dt>
            <dd className="text-xs font-semibold text-ink-800">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────
export function AssetDetailPage() {
  const navigate             = useNavigate();
  const { assetId }          = useParams<{ assetId: string }>();
  const { data: assetData, isLoading, isError } = useAsset(assetId);

  // Fusion données API + valeurs par défaut pour rétrocompatibilité
  const ASSET = assetData ? {
    id:              assetData.uuid ?? assetId ?? '',
    name:            (assetData.name as string) ?? '',
    location:        [(assetData.city as string), (assetData.region as string)].filter(Boolean).join(', '),
    countryCode:     (assetData.country_code as string) ?? 'FR',
    status:          (assetData.state as string) ?? 'financing',
    description:     (assetData.description as string) ?? '',
    installedPower:  `${assetData.installed_power_mwc ?? 0} MWc`,
    annualProduction:`${assetData.annual_production_mwh ?? 0} MWh`,
    commissioningDate: (assetData.commissioning_date as string) ?? '',
    projectDuration: `${assetData.project_duration_years ?? 20} ans`,
    cellUnitPrice:   (assetData.cell_unit_price as number) ?? 1.0,
    totalCells:      (assetData.total_cells as number) ?? 0,
    cellsSubscribed: (assetData.cells_subscribed as number) ?? 0,
    targetYieldRate: (assetData.target_yield_rate as number) ?? 0,
    tags:            ['Énergie solaire', 'Actif réel', 'Assuré'],
    keyInfo:         [],
    overview:        [],
  } : null;

  if (isLoading) {
    return (
      <div className="container-content py-12 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !ASSET) {
    return (
      <div className="container-content py-12 text-center">
        <p className="text-status-danger">Actif introuvable.</p>
        <Button variant="ghost" onClick={() => navigate('/actifs')} className="mt-4">
          ← Retour à la marketplace
        </Button>
      </div>
    );
  }
  const tabs = [
    { id: 'apercu',     label: 'Aperçu',             content: <><AperturePanel /><KeyInfoTable /></> },
    { id: 'financiers', label: 'Détails financiers',  content: <p className="text-sm text-ink-400">Contenu à venir.</p> },
    { id: 'techniques', label: 'Détails techniques',  content: <p className="text-sm text-ink-400">Contenu à venir.</p> },
    { id: 'documents',  label: 'Documents',           content: <p className="text-sm text-ink-400">Contenu à venir.</p> },
    { id: 'performance',label: 'Performance',         content: <p className="text-sm text-ink-400">Contenu à venir.</p> },
    { id: 'risques',    label: 'Risques',             content: <p className="text-sm text-ink-400">Contenu à venir.</p> },
  ];

  return (
    <div>
      <div className="container-content py-6">
        {/* Breadcrumb */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/actifs')} className="mb-6 -ml-2">
          ← Retour à la marketplace
        </Button>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
          {/* ── Colonne principale ──────────────────────────────────── */}
          <div>
            {/* Image principale */}
            <div className="relative mb-5 overflow-hidden rounded-2xl bg-ink-100 aspect-video">
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-100 to-ink-200">
                <Zap className="h-20 w-20 text-primary-300" />
              </div>
              <div className="absolute top-3 left-3">
                <Badge tone="warning" dot className="font-bold uppercase tracking-wide shadow-sm">
                  En financement
                </Badge>
              </div>
              <p className="absolute bottom-3 left-3 text-xs text-white/80 bg-black/40 rounded px-2 py-1">
                📷 Voir toutes les photos (8)
              </p>
            </div>

            {/* En-tête */}
            <div className="mb-5">
              <div className="flex items-center gap-1.5 text-sm text-ink-400 mb-1">
                <span>🇫🇷</span>
                <span>{ASSET.countryCode}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-ink-950">{ASSET.name}</h1>
                <CheckCircle className="h-5 w-5 text-primary-600 shrink-0" aria-label="Actif vérifié" />
              </div>
              <div className="flex items-center gap-1.5 text-sm text-ink-500 mb-3">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                {ASSET.location}
              </div>
              <p className="text-sm text-ink-600 leading-relaxed">{ASSET.description}</p>
            </div>

            {/* Quick stats */}
            <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Zap,      label:'Puissance installée',   value: ASSET.installedPower },
                { icon: Zap,      label:'Production annuelle',   value: ASSET.annualProduction },
                { icon: Calendar, label:'Mise en service',       value: ASSET.commissioningDate },
                { icon: Clock,    label:'Durée du projet',       value: ASSET.projectDuration },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-ink-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1 text-ink-400">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="text-sm font-bold text-ink-900">{value}</p>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="mb-6 flex flex-wrap gap-2">
              {ASSET.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>

            {/* Onglets */}
            <Tabs items={tabs} defaultTab="apercu" />
          </div>

          {/* ── Sidebar investissement ──────────────────────────────── */}
          <AssetInvestBox
            assetId={ASSET.id}
            cellUnitPrice={ASSET.cellUnitPrice}
            totalCells={ASSET.totalCells}
            cellsSubscribed={ASSET.cellsSubscribed}
            targetYieldRate={ASSET.targetYieldRate}
            status={ASSET.status}
          />
        </div>
      </div>

      {/* Footer features */}
      <div className="border-t border-ink-200 bg-white py-6">
        <div className="container-content grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { emoji:'🛡️', label:'Actif réel', desc:'Vous investissez dans un actif solaire physique en exploitation.' },
            { emoji:'📈', label:'Transparence totale', desc:'Suivi en temps réel de la production et des performances de l\'actif.' },
            { emoji:'🔒', label:'Sécurisé', desc:'Actif et revenus garantis par un contrat de vente à long terme.' },
            { emoji:'🌱', label:'Impact positif', desc:'Production d\'énergie verte équivalente à la consommation de 2 300 foyers / an.' },
          ].map(({ emoji, label, desc }) => (
            <div key={label} className="flex items-start gap-2">
              <span className="text-lg">{emoji}</span>
              <div>
                <p className="text-xs font-semibold text-ink-800">{label}</p>
                <p className="text-xs text-ink-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
