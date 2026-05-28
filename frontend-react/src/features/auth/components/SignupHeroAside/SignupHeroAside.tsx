import { ShieldCheck, TrendingUp, Lock, Users } from 'lucide-react';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Actifs réels & vérifiés',
    desc:  'Chaque installation est auditée, documentée et suivie en temps réel.',
  },
  {
    icon: TrendingUp,
    title: 'Rendements attractifs',
    desc:  'Percevez une quote-part des revenus générés par les installations solaires.',
  },
  {
    icon: Lock,
    title: 'Sécurisé & réglementé',
    desc:  'Plateforme régulée, fonds sécurisés, et conformité KYC/AML.',
  },
  {
    icon: Users,
    title: 'Transferts privés',
    desc:  'Échangez vos Solar Cells entre membres vérifiés dans un environnement sécurisé.',
  },
] as const;

export function SignupHeroAside() {
  return (
    <div className="relative flex flex-col justify-between h-full p-10 text-white">
      {/* Dégradé fond */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-ink-950 via-primary-950/80 to-ink-900"
      />
      {/* Cercles décoratifs */}
      <div aria-hidden className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary-600/10" />
      <div aria-hidden className="absolute bottom-20 -left-10 h-48 w-48 rounded-full bg-primary-500/10" />

      {/* Contenu */}
      <div className="relative z-10 flex flex-col gap-10">
        {/* Titre */}
        <div>
          <h2 className="text-3xl font-bold leading-tight text-white">
            Investissez dans des actifs solaires{' '}
            <span className="text-primary-400">réels et tokenisés</span>
          </h2>
          <p className="mt-3 text-sm text-ink-300 leading-relaxed">
            Rejoignez une communauté d'investisseurs engagés dans la transition
            énergétique et percevez des revenus durables.
          </p>
        </div>

        {/* Features */}
        <ul className="flex flex-col gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600/20 ring-1 ring-primary-500/30">
                <Icon className="h-4 w-4 text-primary-400" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-0.5 text-xs text-ink-400 leading-relaxed">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Image décorative */}
      <div className="relative z-10 mt-8 overflow-hidden rounded-xl">
        <div
          className="h-40 w-full rounded-xl bg-gradient-to-br from-primary-900/50 to-primary-700/30
                     flex items-center justify-center"
        >
          {/* Placeholder image panneaux solaires */}
          <div className="text-center">
            <p className="text-4xl">☀️</p>
            <p className="mt-1 text-xs text-primary-300">Centrale solaire de Provence</p>
          </div>
        </div>
      </div>
    </div>
  );
}
