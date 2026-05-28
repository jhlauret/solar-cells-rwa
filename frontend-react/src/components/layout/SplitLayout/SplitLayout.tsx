import { cn } from '@/lib/utils/cn';

interface SplitLayoutProps {
  aside:      React.ReactNode; // Colonne gauche marketing/image
  children:   React.ReactNode; // Colonne droite formulaire
  asideClass?: string;
}

export function SplitLayout({ aside, children, asideClass }: SplitLayoutProps) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      {/* Colonne gauche — masquée en mobile */}
      <div
        className={cn(
          'hidden lg:flex flex-col relative overflow-hidden',
          'bg-ink-950',
          asideClass,
        )}
      >
        {aside}
      </div>

      {/* Colonne droite — contenu principal */}
      <div className="flex flex-col bg-white">
        {children}
      </div>
    </div>
  );
}
