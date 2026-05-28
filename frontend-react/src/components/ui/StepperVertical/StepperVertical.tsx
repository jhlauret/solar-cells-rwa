import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type VStepStatus = 'done' | 'active' | 'pending';

export interface VStepItem {
  label:       string;
  sublabel?:   string;
  status?:     VStepStatus;
}

export interface StepperVerticalProps {
  title?:       string;
  steps:        VStepItem[];
  currentIndex: number;
  className?:   string;
}

const statusLabel: Record<VStepStatus, string> = {
  done:    'Terminé',
  active:  'En cours',
  pending: 'À compléter',
};

export function StepperVertical({
  title,
  steps,
  currentIndex,
  className,
}: StepperVerticalProps) {
  return (
    <nav aria-label="Étapes KYC" className={cn('flex flex-col gap-1', className)}>
      {title && (
        <p className="mb-3 text-xs font-bold tracking-widest text-primary-600 uppercase">
          {title}
        </p>
      )}

      {steps.map((step, i) => {
        const status: VStepStatus =
          i < currentIndex  ? 'done'
          : i === currentIndex ? 'active'
          : 'pending';

        const isLast = i === steps.length - 1;

        return (
          <div key={i} className="flex gap-3">
            {/* Icône + connecteur vertical */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  'border-2 transition-all duration-200',
                  status === 'done'    && 'bg-primary-600 border-primary-600 text-white',
                  status === 'active'  && 'bg-white border-primary-600 text-primary-700 shadow-sm ring-4 ring-primary-100',
                  status === 'pending' && 'bg-ink-50 border-ink-200 text-ink-300',
                )}
                aria-current={status === 'active' ? 'step' : undefined}
              >
                {status === 'done'
                  ? <Check className="h-3.5 w-3.5" aria-hidden />
                  : status === 'pending'
                    ? <Lock className="h-3 w-3" aria-hidden />
                    : <span>{i + 1}</span>
                }
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'my-1 w-0.5 flex-1',
                    i < currentIndex ? 'bg-primary-300' : 'bg-ink-200',
                  )}
                  style={{ minHeight: 20 }}
                  aria-hidden
                />
              )}
            </div>

            {/* Texte */}
            <div className={cn('pb-4', isLast && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-semibold leading-snug',
                  status === 'done'    && 'text-ink-600',
                  status === 'active'  && 'text-primary-700',
                  status === 'pending' && 'text-ink-400',
                )}
              >
                {i + 1}. {step.label}
              </p>
              <p
                className={cn(
                  'text-xs mt-0.5',
                  status === 'active'  ? 'text-primary-500 font-medium'
                  : status === 'done'  ? 'text-status-success font-medium'
                  : 'text-ink-300',
                )}
              >
                {step.sublabel ?? statusLabel[status]}
              </p>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
