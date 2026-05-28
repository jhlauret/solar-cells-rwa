import { cn } from '@/lib/utils/cn';

export interface TagProps {
  children:   React.ReactNode;
  icon?:      React.ReactNode;
  className?: string;
}

export function Tag({ children, icon, className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'rounded-full border border-ink-200 bg-white',
        'px-3 py-1 text-xs font-medium text-ink-600',
        'hover:border-ink-300 transition-colors',
        className,
      )}
    >
      {icon && <span className="text-primary-500" aria-hidden>{icon}</span>}
      {children}
    </span>
  );
}
