import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Checkbox }    from '@/components/ui/Checkbox';
import { Select }      from '@/components/ui/Select';
import { Slider }      from '@/components/ui/Slider';
import { ASSET_TYPE_LABELS, type AssetType, type AssetStatus } from '@/features/marketplace/mock/assets.mock';

export interface AssetFiltersState {
  country:          string;
  types:            AssetType[];
  status:           '' | AssetStatus;
  minYield:         number;
  maxYield:         number;
  sortBy:           string;
}

const DEFAULT_FILTERS: AssetFiltersState = {
  country:  '',
  types:    [],
  status:   '',
  minYield: 0,
  maxYield: 15,
  sortBy:   'yield_desc',
};

interface AssetFiltersProps {
  onChange: (filters: AssetFiltersState) => void;
}

const COUNTRY_OPTIONS = [
  { value: '',   label: 'Tous les pays' },
  { value: 'FR', label: '🇫🇷 France'   },
  { value: 'CH', label: '🇨🇭 Suisse'   },
];

const STATUS_OPTIONS = [
  { value: '',                   label: 'Tous'                  },
  { value: 'financing',          label: 'Financement en cours'  },
  { value: 'in_production',      label: 'Actif en production'   },
  { value: 'financing_complete', label: 'Financement complet'   },
] as const;

const SORT_OPTIONS = [
  { value: 'yield_desc', label: 'Rendement (décroissant)' },
  { value: 'yield_asc',  label: 'Rendement (croissant)'   },
  { value: 'name_asc',   label: 'Nom (A–Z)'               },
  { value: 'newest',     label: 'Les plus récents'        },
];

const ASSET_TYPES = Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][];

export function AssetFilters({ onChange }: AssetFiltersProps) {
  const [filters, setFilters] = useState<AssetFiltersState>(DEFAULT_FILTERS);

  const update = (patch: Partial<AssetFiltersState>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    onChange(next);
  };

  const toggleType = (type: AssetType) => {
    const types = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    update({ types });
  };

  const reset = () => {
    setFilters(DEFAULT_FILTERS);
    onChange(DEFAULT_FILTERS);
  };

  return (
    <aside className="flex flex-col gap-5 p-5 bg-white rounded-2xl border border-ink-200 shadow-card">
      {/* Header filtres */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">Filtres</h2>
      </div>

      {/* Pays */}
      <Select
        label="Pays"
        value={filters.country}
        onChange={(e) => update({ country: e.target.value })}
        options={COUNTRY_OPTIONS}
      />

      {/* Type d'actif */}
      <fieldset>
        <legend className="mb-2.5 text-sm font-medium text-ink-800">Type d'actif</legend>
        <div className="flex flex-col gap-2">
          {ASSET_TYPES.map(([type, label]) => (
            <Checkbox
              key={type}
              label={label}
              checked={filters.types.includes(type)}
              onChange={() => toggleType(type)}
            />
          ))}
        </div>
      </fieldset>

      {/* Statut */}
      <fieldset>
        <legend className="mb-2.5 text-sm font-medium text-ink-800">Statut</legend>
        <div className="flex flex-col gap-2">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value={value}
                checked={filters.status === value}
                onChange={() => update({ status: value as AssetFiltersState['status'] })}
                className="accent-primary-600 h-4 w-4"
              />
              <span className="text-sm text-ink-700">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Slider rendement */}
      <div>
        <Slider
          label="Rendement cible"
          min={0}
          max={15}
          step={0.5}
          value={filters.maxYield}
          valueLabel={`${filters.minYield}% – ${filters.maxYield}%+`}
          onChange={(e) => update({ maxYield: Number(e.target.value) })}
          hint="0 % – 15 %+"
        />
      </div>

      {/* Trier par */}
      <Select
        label="Trier par"
        value={filters.sortBy}
        onChange={(e) => update({ sortBy: e.target.value })}
        options={SORT_OPTIONS}
      />

      {/* Reset */}
      <button
        onClick={reset}
        className="flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800 transition-colors"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        Réinitialiser les filtres
      </button>
    </aside>
  );
}
