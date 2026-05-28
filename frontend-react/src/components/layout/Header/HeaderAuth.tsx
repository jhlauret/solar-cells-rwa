import { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Globe, Bell, ChevronDown, User, LogOut, Settings, Menu, X } from 'lucide-react';
import { cn }       from '@/lib/utils/cn';
import { useAuth }  from '@/contexts/AuthContext';

// ─── Logo (réutilisé) ─────────────────────────────────────────────────────
function Logo() {
  return (
    <Link to="/tableau-de-bord" className="flex items-center gap-2 no-underline">
      <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7" aria-hidden>
        <polygon points="16,2 28,9 28,23 16,30 4,23 4,9"
          className="fill-primary-100 stroke-primary-600" strokeWidth="1.5"/>
        <line x1="10" y1="12" x2="22" y2="12" stroke="#16a34a" strokeWidth="1"/>
        <line x1="10" y1="16" x2="22" y2="16" stroke="#16a34a" strokeWidth="1"/>
        <line x1="10" y1="20" x2="22" y2="20" stroke="#16a34a" strokeWidth="1"/>
        <line x1="14" y1="10" x2="14" y2="22" stroke="#16a34a" strokeWidth="1"/>
        <line x1="18" y1="10" x2="18" y2="22" stroke="#16a34a" strokeWidth="1"/>
      </svg>
      <span className="text-base font-bold">
        <span className="text-ink-900">Solar</span>
        <span className="text-primary-700">Cells</span>
      </span>
    </Link>
  );
}

// ─── Navigation links ─────────────────────────────────────────────────────
const NAV_LINKS = [
  { to: '/tableau-de-bord', label: 'Tableau de bord' },
  { to: '/investir',         label: 'Investir'        },
  { to: '/actifs',           label: 'Actifs'          },
  { to: '/portefeuille',     label: 'Portefeuille'    },
  { to: '/rendement',        label: 'Rendement'       },
  { to: '/transferts',       label: 'Transferts'      },
] as const;

// ─── User menu dropdown ───────────────────────────────────────────────────
function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen]  = useState(false);
  const ref              = useRef<HTMLDivElement>(null);
  const name     = user?.email?.split('@')[0] ?? 'Mon compte';
  const initials = name.slice(0, 2).toUpperCase();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink-100 transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
          {initials}
        </div>
        <span className="hidden sm:inline text-sm font-medium text-ink-800">
          {name}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-ink-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-ink-200 bg-white shadow-card-lg z-50 py-1 animate-fade-in">
          <div className="px-4 py-2.5 border-b border-ink-100">
            <p className="text-sm font-semibold text-ink-900">{name}</p>
            <p className="text-xs text-ink-400">alexandre.b@email.com</p>
          </div>
          {[
            { icon: User,     label: 'Mon profil',    to: '/profil'      },
            { icon: Settings, label: 'Paramètres',    to: '/parametres'  },
          ].map(({ icon: Icon, label, to }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 no-underline hover:bg-ink-50 transition-colors"
            >
              <Icon className="h-4 w-4 text-ink-400" aria-hidden />
              {label}
            </Link>
          ))}
          <div className="border-t border-ink-100 mt-1">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-status-danger hover:bg-status-danger-bg/30 transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────
export function HeaderAuth() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="container-content">
        <div className="flex h-14 items-center justify-between gap-4">

          <Logo />

          {/* Nav desktop */}
          <nav className="hidden xl:flex items-center gap-0.5" aria-label="Navigation investisseur">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors no-underline',
                    isActive
                      ? 'text-primary-700 bg-primary-50 border-b-2 border-primary-600'
                      : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Droite */}
          <div className="flex items-center gap-2">
            <button className="hidden sm:flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800 px-2 py-1 rounded">
              <Globe className="h-4 w-4" aria-hidden /> FR
            </button>

            {/* Notifications */}
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" aria-hidden />
              {/* Badge */}
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-status-warning ring-2 ring-white" />
            </button>

            <UserMenu />

            {/* Burger mobile */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="xl:hidden p-2 rounded-md text-ink-600 hover:bg-ink-100 transition-colors"
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-ink-200 bg-white animate-fade-in">
          <div className="container-content py-3 flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'px-4 py-3 rounded-lg text-sm font-medium transition-colors no-underline',
                    isActive ? 'text-primary-700 bg-primary-50' : 'text-ink-700 hover:bg-ink-100',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
