import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type StepStatus = 'done' | 'active' | 'pending';

export interface StepItem {
  label:   string;
  status?: StepStatus;
}

export interface StepperProps {
  steps:        StepItem[];
  currentIndex: number;
  className?:   string;
}

export function Stepper({ steps, currentIndex, className }: StepperProps) {
  return (
    <nav aria-label="Étapes" className={cn('flex items-center', className)}>
      {steps.map((step, i) => {
        const status: StepStatus =
          i < currentIndex  ? 'done'
          : i === currentIndex ? 'active'
          : 'pending';

        const isLast = i === steps.length - 1;

        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            {/* Bulle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                  'border-2 transition-all duration-200',
                  status === 'done'   && 'bg-primary-600 border-primary-600 text-white',
                  status === 'active' && 'bg-white border-primary-600 text-primary-700 shadow-sm',
                  status === 'pending'&& 'bg-white border-ink-300 text-ink-400',
                )}
                aria-current={status === 'active' ? 'step' : undefined}
              >
                {status === 'done'
                  ? <Check className="h-4 w-4" aria-hidden />
                  : <span>{i + 1}</span>
                }
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  status === 'active'  && 'text-primary-700',
                  status === 'done'    && 'text-ink-600',
                  status === 'pending' && 'text-ink-400',
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connecteur */}
            {!isLast && (
              <div
                className={cn(
                  'mx-2 mb-5 h-0.5 flex-1 transition-colors duration-200',
                  i < currentIndex ? 'bg-primary-600' : 'bg-ink-200',
                )}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
