import { forwardRef, type ButtonHTMLAttributes, isValidElement, cloneElement } from 'react';
import { cn } from '@/lib/utils/cn';
import { Spinner } from '@/components/ui/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize    = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  loading?:   boolean;
  fullWidth?: boolean;
  /** Fusionne les classes du Button dans l'enfant React (ex. <Link>). */
  asChild?:   boolean;
  /** Icône avant le texte. */
  iconLeft?:  React.ReactNode;
  /** Icône après le texte. */
  iconRight?: React.ReactNode;
}

// ─── Styles ───────────────────────────────────────────────────────────────
const base = [
  'inline-flex items-center justify-center gap-2',
  'font-semibold rounded-lg',
  'transition-all duration-150 ease-out',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600',
  'disabled:pointer-events-none disabled:opacity-50',
  'select-none',
].join(' ');

const variants: Record<ButtonVariant, string> = {
  primary:   'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm hover:shadow-md',
  secondary: 'border-2 border-primary-600 text-primary-700 bg-transparent hover:bg-primary-50 active:bg-primary-100',
  ghost:     'text-ink-700 bg-transparent hover:bg-ink-100 active:bg-ink-200',
  danger:    'bg-status-danger text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
  link:      'text-primary-700 bg-transparent underline underline-offset-2 p-0 h-auto hover:text-primary-800',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8  px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

// ─── Slot interne (pour asChild) ─────────────────────────────────────────
type SlotProps = { children: React.ReactElement; className?: string; [key: string]: unknown };
function Slot({ children, ...slotProps }: SlotProps) {
  if (!isValidElement(children)) return null;
  const childProps = children.props as Record<string, unknown>;
  return cloneElement(children, {
    ...slotProps,
    ...childProps,
    className: cn(slotProps.className as string | undefined, childProps.className as string | undefined),
  });
}

// ─── Composant ────────────────────────────────────────────────────────────
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = 'primary',
      size      = 'md',
      loading   = false,
      fullWidth  = false,
      asChild    = false,
      iconLeft,
      iconRight,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const computedClass = cn(
      base,
      variants[variant],
      variant !== 'link' && sizes[size],
      fullWidth && 'w-full',
      className,
    );

    const content = (
      <>
        {loading  && <Spinner size={size === 'sm' ? 'xs' : 'sm'} />}
        {!loading && iconLeft && <span className="shrink-0" aria-hidden>{iconLeft}</span>}
        {children}
        {iconRight && <span className="shrink-0" aria-hidden>{iconRight}</span>}
      </>
    );

    // Mode asChild : fusionner les classes dans l'enfant (ex. <Link>)
    if (asChild && isValidElement(children)) {
      return (
        <Slot className={computedClass} {...(props as Record<string, unknown>)}>
          {children as React.ReactElement}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        className={computedClass}
        {...props}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = 'Button';
