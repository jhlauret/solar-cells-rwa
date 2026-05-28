import { ShieldCheck, Check, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const SECURITY_POINTS = [
  'Données chiffrées',
  'Conformité RGPD',
  'Utilisation sécurisée',
  'Jamais partagées sans votre accord',
] as const;

interface KycSecurityAsideProps {
  showWhySection?: boolean;
}

export function KycSecurityAside({ showWhySection = true }: KycSecurityAsideProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Données sécurisées */}
      <div className="rounded-xl border border-ink-200 bg-white p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 shrink-0">
            <ShieldCheck className="h-4 w-4 text-primary-600" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">Vos données sont sécurisées</p>
            <p className="text-xs text-ink-500 mt-0.5">
              Nous utilisons un prestataire de confiance pour vérifier votre identité
              en toute sécurité.
            </p>
          </div>
        </div>
        <ul className="flex flex-col gap-1.5 pl-1">
          {SECURITY_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-2 text-xs text-ink-600">
              <Check className="h-3.5 w-3.5 shrink-0 text-status-success" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Pourquoi cette vérification */}
      {showWhySection && (
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-sm font-semibold text-ink-900 mb-1">
            Pourquoi cette vérification ?
          </p>
          <p className="text-xs text-ink-500 leading-relaxed mb-2">
            Elle nous permet de garantir un environnement sûr et conforme
            pour tous les investisseurs.
          </p>
          <Link
            to="/politique-de-confidentialite"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 no-underline hover:text-primary-800"
          >
            En savoir plus
            <LinkIcon className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
