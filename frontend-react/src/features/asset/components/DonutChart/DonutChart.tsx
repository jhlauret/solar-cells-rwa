interface DonutChartProps {
  value:     number;    // 0–100 (en %)
  label?:    string;
  sublabel?: string;
  size?:     number;
  stroke?:   number;
  className?: string;
}

export function DonutChart({
  value,
  label,
  sublabel,
  size     = 120,
  stroke   = 12,
  className,
}: DonutChartProps) {
  const r   = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash  = (value / 100) * circ;
  const cx    = size / 2;
  const cy    = size / 2;

  return (
    <div className={`relative inline-flex items-center justify-center ${className ?? ''}`}>
      <svg width={size} height={size} aria-hidden>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#16a34a"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4} // start at top
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-all duration-700"
        />
      </svg>

      {/* Texte central */}
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {label && (
            <span className="text-base font-bold text-primary-700 leading-none">{label}</span>
          )}
          {sublabel && (
            <span className="text-[10px] text-ink-400 leading-snug mt-0.5">{sublabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
