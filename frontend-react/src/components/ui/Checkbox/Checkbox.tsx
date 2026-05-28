import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?:       React.ReactNode;
  description?: string;
  error?:       string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className, id, ...props }, ref) => {
    const checkId = id ?? (typeof label === 'string'
      ? label.toLowerCase().replace(/\s+/g, '-')
      : undefined);
    const errorId = error ? `${checkId}-error` : undefined;

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <label
          htmlFor={checkId}
          className={cn(
            'flex items-start gap-3 cursor-pointer group',
            props.disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          {/* Checkbox custom */}
          <div className="relative mt-0.5 flex-shrink-0">
            <input
              ref={ref}
              type="checkbox"
              id={checkId}
              aria-invalid={!!error}
              aria-describedby={errorId}
              className={cn(
                'peer h-4 w-4 cursor-pointer appearance-none rounded',
                'border-2 border-ink-300 bg-white',
                'checked:border-primary-600 checked:bg-primary-600',
                'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
                'transition-all duration-100',
                error && 'border-status-danger',
                props.disabled && 'cursor-not-allowed',
              )}
              {...props}
            />
            {/* Checkmark SVG */}
            <svg
              className="pointer-events-none absolute inset-0 h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <path
                d="M3.5 8L6.5 11L12.5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Label + description */}
          {label && (
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-ink-800 group-hover:text-ink-950 leading-tight">
                {label}
              </span>
              {description && (
                <span className="text-xs text-ink-400">{description}</span>
              )}
            </div>
          )}
        </label>

        {error && (
          <p id={errorId} role="alert" className="ml-7 text-xs text-status-danger font-medium">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';
