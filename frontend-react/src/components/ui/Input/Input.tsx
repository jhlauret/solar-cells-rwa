import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:     string;
  hint?:      string;
  error?:     string;
  iconLeft?:  React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, iconLeft, iconRight, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const hintId  = hint  ? `${inputId}-hint`  : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-ink-800"
          >
            {label}
            {props.required && (
              <span className="ml-0.5 text-status-danger" aria-hidden>*</span>
            )}
          </label>
        )}

        <div className="relative">
          {iconLeft && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
              {iconLeft}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={cn(hintId, errorId).trim() || undefined}
            className={cn(
              'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink-900',
              'placeholder:text-ink-400',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:border-primary-500',
              error
                ? 'border-status-danger ring-1 ring-status-danger/30'
                : 'border-ink-300 hover:border-ink-400',
              iconLeft  && 'pl-9',
              iconRight && 'pr-9',
              props.disabled && 'cursor-not-allowed bg-ink-100 text-ink-400',
              className,
            )}
            {...props}
          />

          {iconRight && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
              {iconRight}
            </span>
          )}
        </div>

        {hint && !error && (
          <p id={hintId} className="text-xs text-ink-400">{hint}</p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-status-danger font-medium">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
