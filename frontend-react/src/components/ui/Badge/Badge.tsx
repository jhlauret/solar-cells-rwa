import { cn } from '@/lib/utils/cn';

export type BadgeTone = 'success' | 'warning' | 'info' | 'muted' | 'danger' | 'primary';

export interface BadgeProps {
  children:   React.ReactNode;
  tone?:      BadgeTone;
  dot?:       boolean;
  className?: string;
}

const tones: Record<BadgeTone, string> = {
  success: 'bg-status-success-bg  text-status-success  ring-status-success/20',
  warning: 'bg-status-warning-bg  text-status-warning  ring-status-warning/20',
  info:    'bg-status-info-bg     text-status-info     ring-status-info/20',
  muted:   'bg-status-muted-bg    text-status-muted    ring-status-muted/20',
  danger:  'bg-status-danger-bg   text-status-danger   ring-status-danger/20',
  primary: 'bg-primary-100        text-primary-800     ring-primary-200',
};

const dotTones: Record<BadgeTone, string> = {
  success: 'fill-status-success',
  warning: 'fill-status-warning',
  info:    'fill-status-info',
  muted:   'fill-status-muted',
  danger:  'fill-status-danger',
  primary: 'fill-primary-600',
};

export function Badge({ children, tone = 'muted', dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-2.5 py-0.5 rounded-full text-xs font-semibold',
        'ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {dot && (
        <svg viewBox="0 0 6 6" aria-hidden="true" className={cn('h-1.5 w-1.5', dotTones[tone])}>
          <circle cx={3} cy={3} r={3} />
        </svg>
      )}
      {children}
    </span>
  );
}
