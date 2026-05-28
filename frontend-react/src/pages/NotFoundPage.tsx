import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-50 px-4 text-center">
      <div className="mb-6">
        <p className="text-8xl font-black text-primary-100 select-none">404</p>
      </div>
      <h1 className="text-2xl font-bold text-ink-950 mb-2">Page introuvable</h1>
      <p className="text-sm text-ink-500 max-w-sm mb-8">
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild><Link to="/">Retour à l'accueil</Link></Button>
        <Button variant="secondary" asChild><Link to="/actifs">Voir les actifs</Link></Button>
      </div>
    </div>
  );
}
