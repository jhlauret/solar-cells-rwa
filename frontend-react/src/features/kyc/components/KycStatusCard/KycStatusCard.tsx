import { Clock } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

export type KycStatusValue = 'not_started' | 'in_progress' | 'submitted' | 'under_review' | 'validated' | 'rejected' | 'expired';

const STATUS_CONFIG: Record<KycStatusValue, { label: string; tone: BadgeTone }> = {
  not_started:  { label: 'Non démarré',    tone: 'muted'    },
  in_progress:  { label: 'En cours',       tone: 'warning'  },
  submitted:    { label: 'Soumis',         tone: 'info'     },
  under_review: { label: 'En vérification',tone: 'info'     },
  validated:    { label: 'Validé',         tone: 'success'  },
  rejected:     { label: 'Refusé',         tone: 'danger'   },
  expired:      { label: 'Expiré',         tone: 'danger'   },
};

interface KycStatusCardProps {
  status: KycStatusValue;
  lastUpdated?: string; // format "aujourd'hui, 10:24"
}

export function KycStatusCard({ status, lastUpdated }: KycStatusCardProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <p className="mb-3 text-xs font-bold text-ink-500 uppercase tracking-wide">
        Statut actuel
      </p>
      <Badge tone={config.tone} dot className="text-sm px-3 py-1">
        {config.label}
      </Badge>
      {lastUpdated && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
          <Clock className="h-3 w-3" aria-hidden />
          <span>Dernière mise à jour : {lastUpdated}</span>
        </div>
      )}
    </div>
  );
}
