import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:       string;
  hint?:        string;
  error?:       string;
  options?:     SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, hint, error, options, placeholder, className, id, children, ...props },
    ref,
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const hintId   = hint  ? `${selectId}-hint`  : undefined;
    const errorId  = error ? `${selectId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-ink-800">
            {label}
            {props.required && (
              <span className="ml-0.5 text-status-danger" aria-hidden>*</span>
            )}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={!!error}
            aria-describedby={cn(hintId, errorId).trim() || undefined}
            className={cn(
              'w-full appearance-none rounded-lg border bg-white',
              'px-3 py-2.5 pr-8 text-sm text-ink-900',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              error
                ? 'border-status-danger ring-1 ring-status-danger/30'
                : 'border-ink-300 hover:border-ink-400',
              props.disabled && 'cursor-not-allowed bg-ink-100 text-ink-400',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
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

Select.displayName = 'Select';
