import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?:      string;
  valueLabel?: string;     // Affichage de la valeur courante
  hint?:       string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, valueLabel, hint, className, ...props }, ref) => (
    <div className={cn('flex flex-col gap-2', className)}>
      {(label || valueLabel) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-sm font-medium text-ink-800">{label}</label>
          )}
          {valueLabel && (
            <span className="text-sm font-semibold text-primary-700">{valueLabel}</span>
          )}
        </div>
      )}

      <input
        ref={ref}
        type="range"
        className={cn(
          'w-full appearance-none',
          'h-1.5 rounded-full bg-ink-200',
          'accent-primary-600',
          // Track filled via CSS custom property trick
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-primary-600',
          '[&::-webkit-slider-thumb]:shadow-card',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
          '[&::-webkit-slider-thumb]:transition-transform',
          '[&::-webkit-slider-thumb]:hover:scale-110',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
        )}
        {...props}
      />

      {hint && <p className="text-xs text-ink-400">{hint}</p>}
    </div>
  ),
);

Slider.displayName = 'Slider';
