import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Leaf,
  Lock,
  Play,
  Zap,
  Euro,
  Users,
  TrendingUp,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

// ─── Données statiques ────────────────────────────────────────────────────

const STATS = [
  {
    icon:   BarChart3,
    value:  '12 450',
    label:  'Actifs financés',
    sub:    '+24 ce mois-ci',
  },
  {
    icon:   Zap,
    value:  '28,7 GWh',
    label:  'Énergie produite',
    sub:    'ce mois-ci',
  },
  {
    icon:   Euro,
    value:  '8,42 %',
    label:  'Rendement moyen',
    sub:    'annualisé',
  },
  {
    icon:   Users,
    value:  '3 245',
    label:  'Investisseurs',
    sub:    'dans 28 pays',
  },
] as const;

const FEATURES = [
  {
    icon:   ShieldCheck,
    title:  'Actifs réels & transparents',
    desc:   'Chaque installation est vérifiée, documentée et suivie en temps réel (production, maintenance, assurance).',
    cta:    'Découvrir nos actifs',
    to:     '/actifs',
  },
  {
    icon:   TrendingUp,
    title:  'Rendement distribué',
    desc:   'Vous percevez une quote-part des revenus générés par l\'actif, distribuée automatiquement en euros numériques.',
    cta:    'Comprendre le rendement',
    to:     '/rendement',
  },
  {
    icon:   Lock,
    title:  'Transferts privés & sécurisés',
    desc:   'Échangez vos Solar Cells entre membres vérifiés dans un environnement sécurisé et conforme.',
    cta:    'En savoir plus',
    to:     '/comment-ca-marche',
  },
] as const;

const PARTNERS = [
  { name: 'Bridge by Stripe', abbr: 'Bridge' },
  { name: 'Tempo',            abbr: 'TEMPO'  },
  { name: 'Swiss Banking',    abbr: '•Swiss Banking' },
  { name: 'Certified Assets', abbr: 'Certified ✓' },
] as const;

// ─── Sous-composants ──────────────────────────────────────────────────────

/** Schéma 1 → 2 → 3 (héro droite) */
function TokenizationDiagram() {
  const steps = [
    {
      num: '1',
      title: 'ACTIF RÉEL',
      desc:  'Panneau solaire physique',
      bg:    'bg-primary-50',
      border: 'border-primary-200',
    },
    {
      num: '2',
      title: 'FRACTIONNEMENT',
      desc:  'Découpé en 100 cells (unités)',
      bg:    'bg-primary-100',
      border: 'border-primary-300',
    },
    {
      num: '3',
      title: 'TOKENISATION',
      desc:  '1 Solar Cell = 1 €',
      bg:    'bg-primary-600',
      border: 'border-primary-700',
      inverted: true,
    },
  ] as const;

  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          {/* Connecteur vertical */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                step.inverted
                  ? 'bg-primary-600 text-white'
                  : 'bg-primary-600 text-white',
              )}
            >
              {step.num}
            </div>
            {i < steps.length - 1 && (
              <div className="mt-1 w-0.5 flex-1 bg-primary-200" style={{ height: 16 }} />
            )}
          </div>
          {/* Carte */}
          <div
            className={cn(
              'flex-1 rounded-xl border p-4 transition-shadow hover:shadow-card-md mb-1',
              step.bg,
              step.border,
            )}
          >
            <p
              className={cn(
                'text-[10px] font-bold tracking-wider uppercase mb-0.5',
                step.inverted ? 'text-primary-100' : 'text-primary-600',
              )}
            >
              {step.title}
            </p>
            <p
              className={cn(
                'text-sm font-medium',
                step.inverted ? 'text-white' : 'text-ink-700',
              )}
            >
              {step.desc}
            </p>
          </div>
        </div>
      ))}

      {/* Légende bas */}
      <div className="mt-2 flex items-center justify-between text-xs text-ink-400">
        <span>Vous investissez</span>
        <span>→</span>
        <span>L'actif produit de l'énergie</span>
        <span>→</span>
        <span>Vous percevez des revenus</span>
      </div>
    </div>
  );
}

/** Badge de confiance */
function TrustBadge({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-ink-500">
      <Icon className="h-3.5 w-3.5 text-primary-600" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

/** Carte de stat */
function StatCard({
  icon: Icon,
  value,
  label,
  sub,
}: (typeof STATS)[number]) {
  return (
    <div className="flex flex-col items-center gap-1 py-6 px-4 border-r border-ink-200 last:border-0">
      <Icon className="h-8 w-8 text-primary-500 mb-1" aria-hidden />
      <p className="text-2xl font-bold text-ink-900 tabular-nums">{value}</p>
      <p className="text-sm text-ink-500 text-center">{label}</p>
      {sub && <p className="text-xs text-primary-600 font-medium">{sub}</p>}
    </div>
  );
}

/** Carte feature */
function FeatureCard({
  icon: Icon,
  title,
  desc,
  cta,
  to,
}: (typeof FEATURES)[number]) {
  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl shadow-card hover:shadow-card-md transition-shadow">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
        <Icon className="h-6 w-6 text-primary-600" aria-hidden />
      </div>
      <div>
        <h3 className="text-base font-semibold text-ink-900 mb-1">{title}</h3>
        <p className="text-sm text-ink-500 leading-relaxed">{desc}</p>
      </div>
      <Link
        to={to}
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 no-underline hover:gap-2 transition-all"
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="flex flex-col">

      {/* ── SECTION HÉRO ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        {/* Fond décoratif */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-primary-50/60 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-[300px] w-[400px] rounded-full bg-primary-100/40 blur-3xl" />
        </div>

        <div className="container-content py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Colonne gauche */}
            <div className="flex flex-col gap-6 animate-slide-up">
              {/* Tag */}
              <p className="text-xs font-bold tracking-widest text-primary-600 uppercase">
                Actifs réels&nbsp;•&nbsp;Transparence&nbsp;•&nbsp;Impact
              </p>

              {/* Titre */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] text-ink-950">
                Investissez dans des actifs solaires{' '}
                <span className="text-primary-600">tokenisés</span>
              </h1>

              {/* Sous-titre */}
              <p className="text-lg text-ink-500 max-w-lg leading-relaxed">
                Achetez des Solar Cells dès&nbsp;<strong className="text-ink-700">1&nbsp;€</strong> et percevez
                une quote-part des revenus générés par des installations solaires réelles.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 items-center">
                <Button size="lg" asChild>
                  <Link to="/inscription">Créer un compte</Link>
                </Button>
                <button className="inline-flex items-center gap-2 text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors group">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-300 group-hover:border-primary-400 group-hover:bg-primary-50 transition-all">
                    <Play className="h-3.5 w-3.5 ml-0.5 text-ink-600 group-hover:text-primary-600" fill="currentColor" aria-hidden />
                  </span>
                  Voir la vidéo&nbsp;(1&nbsp;min)
                </button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-4 pt-2">
                <TrustBadge icon={ShieldCheck} label="Sécurisé & Régulé" />
                <TrustBadge icon={Leaf}        label="Actifs réels" />
                <TrustBadge icon={Lock}        label="Transferts privés" />
              </div>
            </div>

            {/* Colonne droite — schéma tokenisation */}
            <div className="bg-ink-50 rounded-2xl p-6 shadow-card lg:p-8 animate-fade-in">
              <TokenizationDiagram />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────────────────────────────── */}
      <section className="border-y border-ink-200 bg-white">
        <div className="container-content">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-ink-200">
            {STATS.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-24">
        <div className="container-content">
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PARTENAIRES ────────────────────────────────────────────────── */}
      <section className="border-t border-ink-200 bg-white py-8">
        <div className="container-content">
          <p className="text-center text-xs text-ink-400 mb-6">
            Soutenu par des technologies et partenaires de confiance
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
            {PARTNERS.map((p) => (
              <div
                key={p.name}
                className="text-sm font-semibold text-ink-400 hover:text-ink-700 transition-colors"
                title={p.name}
              >
                {p.abbr}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
