import { cn } from '@/lib/utils/cn';

export type ProgressBarTone = 'success' | 'warning' | 'primary' | 'muted';

export interface ProgressBarProps {
  value:      number;          // 0–100
  tone?:      ProgressBarTone;
  showLabel?: boolean;
  label?:     string;
  height?:    'xs' | 'sm' | 'md';
  className?: string;
}

const tones: Record<ProgressBarTone, string> = {
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  primary: 'bg-primary-600',
  muted:   'bg-ink-300',
};

const heights = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2.5',
};

export function ProgressBar({
  value,
  tone = 'primary',
  showLabel = false,
  label,
  height = 'sm',
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between text-xs text-ink-500">
          <span>{label ?? `${clamped}%`}</span>
          {!label && <span>{clamped}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn('w-full overflow-hidden rounded-full bg-ink-100', heights[height])}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', tones[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
