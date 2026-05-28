import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

// ─── Logo ─────────────────────────────────────────────────────────────────
function SolarCellsLogo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2 no-underline', className)}>
      {/* Icône hexagonale simple — sera remplacée par le vrai SVG */}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <polygon
          points="16,2 28,9 28,23 16,30 4,23 4,9"
          className="fill-primary-100 stroke-primary-600"
          strokeWidth="1.5"
        />
        {/* Grille de panneaux solaire stylisée */}
        <line x1="10" y1="12" x2="22" y2="12" stroke="#16a34a" strokeWidth="1" />
        <line x1="10" y1="16" x2="22" y2="16" stroke="#16a34a" strokeWidth="1" />
        <line x1="10" y1="20" x2="22" y2="20" stroke="#16a34a" strokeWidth="1" />
        <line x1="14" y1="10" x2="14" y2="22" stroke="#16a34a" strokeWidth="1" />
        <line x1="18" y1="10" x2="18" y2="22" stroke="#16a34a" strokeWidth="1" />
      </svg>
      <span className="text-lg font-bold tracking-tight">
        <span className="text-ink-900">Solar</span>
        <span className="text-primary-700">Cells</span>
      </span>
    </Link>
  );
}

// ─── Liens de navigation ──────────────────────────────────────────────────
const NAV_LINKS = [
  { to: '/investir',          label: 'Investir' },
  { to: '/actifs',            label: 'Actifs' },
  { to: '/comment-ca-marche', label: 'Comment ça marche' },
  { to: '/rendement',         label: 'Rendement' },
  { to: '/a-propos',          label: 'À propos' },
] as const;

// ─── Composant principal ───────────────────────────────────────────────────
export function HeaderPublic() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-ink-200 shadow-sm">
      <div className="container-content">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <SolarCellsLogo />

          {/* Navigation desktop */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Navigation principale">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors no-underline',
                    isActive
                      ? 'text-primary-700 bg-primary-50'
                      : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Actions droite */}
          <div className="flex items-center gap-3">
            {/* Sélecteur langue */}
            <button
              aria-label="Changer de langue"
              className="hidden sm:flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800 transition-colors px-2 py-1 rounded"
            >
              <Globe className="h-4 w-4" aria-hidden />
              <span>FR</span>
            </button>

            {/* Connexion */}
            <Link
              to="/connexion"
              className="hidden sm:inline-flex text-sm font-medium text-ink-700 hover:text-ink-900 no-underline px-3 py-2 rounded hover:bg-ink-100 transition-colors"
            >
              Se connecter
            </Link>

            {/* CTA principal */}
            <Button
              asChild
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link to="/inscription">Créer un compte</Link>
            </Button>

            {/* Burger mobile */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-md text-ink-600 hover:bg-ink-100 transition-colors"
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-ink-200 bg-white animate-fade-in">
          <div className="container-content py-4 flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'px-4 py-3 rounded-lg text-sm font-medium transition-colors no-underline',
                    isActive
                      ? 'text-primary-700 bg-primary-50'
                      : 'text-ink-700 hover:bg-ink-100',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="pt-3 mt-2 border-t border-ink-100 flex flex-col gap-2">
              <Link
                to="/connexion"
                className="text-sm text-center font-medium text-ink-700 no-underline py-2"
                onClick={() => setMobileOpen(false)}
              >
                Se connecter
              </Link>
              <Button fullWidth onClick={() => setMobileOpen(false)}>
                Créer un compte
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
