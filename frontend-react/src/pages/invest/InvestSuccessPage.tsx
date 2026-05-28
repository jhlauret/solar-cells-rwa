import { Link } from 'react-router-dom';
import { CheckCircle, TrendingUp, BarChart2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge }  from '@/components/ui/Badge';

const TX_HASH = '0x7f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a';

export function InvestSuccessPage() {
  return (
    <div className="min-h-dvh bg-ink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Card principale */}
        <div className="rounded-2xl bg-white shadow-card-lg border border-ink-200 p-8 text-center">
          {/* Cercle checkmark */}
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-status-success-bg animate-pulse" />
            <CheckCircle className="relative h-12 w-12 text-status-success" aria-hidden />
          </div>

          <h1 className="text-2xl font-bold text-ink-950 mb-2">
            Investissement réalisé avec succès !
          </h1>
          <p className="text-sm text-ink-500 mb-6">
            Vos Solar Cells ont été créditées sur votre compte SolarCells.
            Vous recevrez une confirmation par e-mail sous peu.
          </p>

          {/* Récap */}
          <div className="rounded-xl bg-ink-50 p-4 mb-6 text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                <span className="text-xl">☀️</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">Centrale solaire de Provence</p>
                <Badge tone="success" dot className="text-[10px] mt-0.5">En production</Badge>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Solar Cells', value: '150 SCT' },
                { label: 'Montant investi', value: '150,00 €' },
                { label: 'Rendement cible', value: '8,5%/an' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-ink-400">{label}</p>
                  <p className="text-sm font-bold text-ink-900 tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction hash */}
          <div className="mb-6 rounded-lg bg-ink-50 px-4 py-2.5 text-left">
            <p className="text-[10px] text-ink-400 mb-0.5">Référence de transaction</p>
            <code className="text-xs font-mono text-ink-600 truncate block">{TX_HASH}</code>
          </div>

          {/* Prochaines étapes */}
          <div className="mb-6 text-left rounded-xl border border-ink-200 p-4">
            <p className="text-sm font-semibold text-ink-800 mb-3">Prochaines étapes</p>
            <ul className="flex flex-col gap-2.5">
              {[
                { icon: BarChart2,  text: 'Suivez votre investissement depuis votre portefeuille.' },
                { icon: TrendingUp, text: 'Recevez vos premiers revenus au prochain trimestre.' },
                { icon: ArrowRight, text: 'Revendez vos Solar Cells sur la marketplace secondaire si besoin.' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-100">
                    <Icon className="h-3.5 w-3.5 text-primary-600" aria-hidden />
                  </div>
                  <span className="text-xs text-ink-600 leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Button fullWidth size="lg" asChild>
              <Link to="/portefeuille">Voir mon portefeuille →</Link>
            </Button>
            <Button variant="ghost" fullWidth asChild>
              <Link to="/actifs">Découvrir d'autres actifs</Link>
            </Button>
          </div>
        </div>

        {/* Trust footer */}
        <p className="mt-4 text-center text-xs text-ink-400">
          🔒 Transaction enregistrée de façon sécurisée · Conformité KYC/AML · RGPD
        </p>
      </div>
    </div>
  );
}
