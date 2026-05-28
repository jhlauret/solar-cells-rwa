import { Link } from 'react-router-dom';
import { Headphones } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface OnboardingLayoutProps {
  sidebar:      React.ReactNode;   // StepperVertical
  children:     React.ReactNode;   // Contenu principal
  aside?:       React.ReactNode;   // Panel droit optionnel (statut, conseils)
  footerBadges?: React.ReactNode;  // Badges réglementaires bas de page
  className?:   string;
}

const TRUST_BADGES = [
  '🇨🇭 Compte suisse sécurisé',
  '✓ Conformité FINMA',
  '✓ Conformité AML/KYC',
  '✓ Conformité RGPD',
] as const;

export function OnboardingLayout({
  sidebar,
  children,
  aside,
  footerBadges,
  className,
}: OnboardingLayoutProps) {
  return (
    <div className={cn('flex min-h-dvh flex-col', className)}>
      {/* Header minimal */}
      <header className="border-b border-ink-200 bg-white">
        <div className="container-content flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 no-underline">
            <span className="text-base font-bold">
              <span className="text-ink-900">Solar</span>
              <span className="text-primary-700">Cells</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Corps en 3 colonnes */}
      <div className="flex flex-1">
        {/* Sidebar gauche */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-6 border-r border-ink-200 bg-white p-6">
          {sidebar}

          {/* Aide */}
          <div className="mt-auto rounded-xl bg-ink-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Headphones className="h-4 w-4 text-ink-500" aria-hidden />
              <p className="text-xs font-semibold text-ink-700">Besoin d'aide ?</p>
            </div>
            <p className="text-xs text-ink-400 mb-2">
              Notre équipe est disponible pour vous accompagner.
            </p>
            <Link
              to="/contact"
              className="text-xs font-semibold text-primary-700 no-underline hover:text-primary-800"
            >
              Contacter le support →
            </Link>
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="flex flex-1 flex-col">
          <div className={cn(
            'flex-1 p-6 lg:p-10',
            aside ? 'lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start' : '',
          )}>
            <div>{children}</div>
            {aside && (
              <div className="hidden lg:flex flex-col gap-4 pt-2">{aside}</div>
            )}
          </div>

          {/* Footer badges réglementaires */}
          <footer className="border-t border-ink-200 bg-white">
            <div className="container-content py-4">
              {footerBadges ?? (
                <div className="flex flex-wrap items-center justify-center gap-6">
                  {TRUST_BADGES.map((badge) => (
                    <span key={badge} className="text-xs text-ink-400 font-medium">
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
