import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface RadioCardProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label:        string;
  description?: string;
  badge?:       string;
  meta?:        React.ReactNode; // zone droite libre (logos, sous-info)
  icon?:        React.ReactNode;
}

export const RadioCard = forwardRef<HTMLInputElement, RadioCardProps>(
  ({ label, description, badge, meta, icon, className, id, ...props }, ref) => {
    const radioId = id ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
      <label
        htmlFor={radioId}
        className={cn(
          'relative flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4',
          'transition-all duration-150',
          'has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50/50 has-[:checked]:shadow-card',
          'border-ink-200 bg-white hover:border-ink-300 hover:shadow-sm',
          props.disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        {/* Icône */}
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            {icon}
          </div>
        )}

        {/* Texte */}
        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink-900">{label}</span>
            {badge && (
              <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <span className="text-xs text-ink-500 leading-relaxed">{description}</span>
          )}
          {meta && <div className="mt-1">{meta}</div>}
        </div>

        {/* Input radio caché + indicateur custom */}
        <div className="flex shrink-0 items-center justify-center pt-0.5">
          <input
            ref={ref}
            id={radioId}
            type="radio"
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'h-5 w-5 rounded-full border-2 border-ink-300 bg-white',
              'peer-checked:border-primary-600 peer-checked:bg-primary-600',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-1',
              'transition-all duration-150 relative',
            )}
          >
            {/* Point central */}
            <div className="absolute inset-[4px] rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>
      </label>
    );
  },
);

RadioCard.displayName = 'RadioCard';
