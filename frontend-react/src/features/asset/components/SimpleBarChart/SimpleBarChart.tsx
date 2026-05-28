interface BarData {
  year:       string;
  production: number;  // MWh
  revenue:    number;  // €
}

interface SimpleBarChartProps {
  data:      BarData[];
  mode?:     'production' | 'revenue';
  className?: string;
}

const COLORS = { production: '#16a34a', revenue: '#f59e0b' };

export function SimpleBarChart({ data, mode = 'production', className }: SimpleBarChartProps) {
  const values = data.map((d) => (mode === 'production' ? d.production : d.revenue));
  const max    = Math.max(...values, 1);

  const chartH = 120;
  const barW   = 24;
  const gap    = 8;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <div className={`overflow-x-auto ${className ?? ''}`}>
      <div className="min-w-max">
        <svg
          width={totalW}
          height={chartH + 24}
          aria-label={`Graphique de ${mode === 'production' ? 'production' : 'rendement'} par année`}
        >
          {data.map((d, i) => {
            const val  = mode === 'production' ? d.production : d.revenue;
            const barH = Math.max(4, (val / max) * chartH);
            const x    = i * (barW + gap);
            const y    = chartH - barH;
            const isProjected = i >= data.length - 3; // dernières années = projection

            return (
              <g key={d.year}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={3}
                  fill={isProjected ? `${COLORS[mode]}60` : COLORS[mode]}
                  className="transition-all duration-300"
                />
                <text
                  x={x + barW / 2}
                  y={chartH + 16}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#94a3b8"
                  fontFamily="inherit"
                >
                  {d.year.slice(-2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/** Données mock pour la Centrale de Provence (PDF p.9) */
export const MOCK_PERFORMANCE_DATA: BarData[] = [
  { year: '2024', production: 5800, revenue: 4850 },
  { year: '2025', production: 6250, revenue: 5200 },
  { year: '2026', production: 6180, revenue: 5150 },
  { year: '2027', production: 6300, revenue: 5250 },
  { year: '2028', production: 6100, revenue: 5080 },
  { year: '2029', production: 6200, revenue: 5160 },
  { year: '2030', production: 6050, revenue: 5040 },
  { year: '2031', production: 5900, revenue: 4920 },
  { year: '2032', production: 5750, revenue: 4790 },
  { year: '2033+',production: 5600, revenue: 4670 },
];
