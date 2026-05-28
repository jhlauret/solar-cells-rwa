import { Link }     from 'react-router-dom';
import { Stepper }  from '@/components/ui/Stepper';
import { cn }       from '@/lib/utils/cn';

const INVEST_STEPS = [
  { label: 'Montant'      },
  { label: 'Paiement'     },
  { label: 'Résumé'       },
  { label: 'Confirmation' },
];

interface InvestLayoutProps {
  currentStep: number;       // 0-based
  children:    React.ReactNode;
  aside?:      React.ReactNode;
  className?:  string;
}

export function InvestLayout({ currentStep, children, aside, className }: InvestLayoutProps) {
  return (
    <div className={cn('flex min-h-dvh flex-col bg-ink-50', className)}>
      {/* Header */}
      <header className="border-b border-ink-200 bg-white shadow-sm">
        <div className="container-content flex h-14 items-center justify-between">
          <Link to="/" className="text-base font-bold no-underline">
            <span className="text-ink-900">Solar</span>
            <span className="text-primary-700">Cells</span>
          </Link>
          <Stepper steps={INVEST_STEPS} currentIndex={currentStep} />
          <div className="w-24" /> {/* spacer */}
        </div>
      </header>

      {/* Corps */}
      <main className="flex-1 container-content py-8">
        <div className={cn(
          'grid gap-8 items-start',
          aside ? 'lg:grid-cols-[1fr_320px]' : '',
        )}>
          <div>{children}</div>
          {aside && <div>{aside}</div>}
        </div>
      </main>
    </div>
  );
}
