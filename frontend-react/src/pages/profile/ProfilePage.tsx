import { useState } from 'react';
import { User, ShieldCheck, Bell, CreditCard, LogOut, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge }    from '@/components/ui/Badge';
import { Button }   from '@/components/ui/Button';
import { Input }    from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Spinner }  from '@/components/ui/Spinner';
import { useAuth }  from '@/contexts/AuthContext';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { ApiError } from '@/lib/api-client';

const SECTIONS = [
  { id: 'personal',      icon: User,        label: 'Informations personnelles' },
  { id: 'security',      icon: ShieldCheck, label: 'Sécurité & KYC'           },
  { id: 'notifications', icon: Bell,        label: 'Notifications'             },
  { id: 'banking',       icon: CreditCard,  label: 'Informations bancaires'   },
] as const;

type Section = typeof SECTIONS[number]['id'];

// ─── Section Informations personnelles ───────────────────────────────────────
function PersonalSection() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [name,  setName]      = useState('');
  const [phone, setPhone]     = useState('');

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const displayName  = name  || profile?.name  || '';
  const displayPhone = phone || profile?.phone || '';

  const handleSave = async () => {
    setError(null); setSuccess(false);
    try {
      await updateProfile.mutateAsync({
        name:  name  || undefined,
        phone: phone || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la sauvegarde.');
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-ink-950 mb-4">Informations personnelles</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Input label="Nom complet"  value={displayName}  onChange={e => setName(e.target.value)} />
        <Input label="E-mail"       value={profile?.email ?? ''} readOnly disabled />
        <Input label="Téléphone"    value={displayPhone} onChange={e => setPhone(e.target.value)} type="tel" />
        <Input label="Date de naissance" value={profile?.dateOfBirth ?? ''} readOnly disabled />
        <Input label="Nationalité / Pays" value={profile?.country ?? ''} readOnly disabled />
        <Input label="Type d'investisseur" value={profile?.investorType ?? ''} readOnly disabled className="capitalize" />
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-status-danger-bg border border-status-danger/30 px-4 py-3 mb-4">
          <AlertCircle className="h-4 w-4 text-status-danger shrink-0" />
          <p className="text-sm text-status-danger">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-status-success-bg border border-status-success/30 px-4 py-3 mb-4">
          <CheckCircle className="h-4 w-4 text-status-success shrink-0" />
          <p className="text-sm text-status-success">Profil mis à jour avec succès.</p>
        </div>
      )}
      <div className="flex justify-end">
        <Button loading={updateProfile.isPending} onClick={handleSave}>
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}

// ─── Section Sécurité ─────────────────────────────────────────────────────────
function SecuritySection() {
  const { data: profile } = useProfile();
  const kycTone = profile?.kycStatus === 'validated' ? 'success' as const : 'warning' as const;
  const kycLabel = profile?.kycStatus === 'validated' ? 'Validé' :
                   profile?.kycStatus === 'under_review' ? 'En cours de validation' : 'Non vérifié';
  return (
    <div>
      <h2 className="text-lg font-bold text-ink-950 mb-4">Sécurité & KYC</h2>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between p-4 rounded-xl border border-ink-200">
          <div>
            <p className="text-sm font-semibold text-ink-900">Statut KYC</p>
            <p className="text-xs text-ink-400">Vérification d'identité réglementaire</p>
          </div>
          <Badge tone={kycTone} dot>{kycLabel}</Badge>
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl border border-ink-200">
          <div>
            <p className="text-sm font-semibold text-ink-900">Email</p>
            <p className="text-xs text-ink-400">{profile?.email}</p>
          </div>
          <Badge tone={profile?.emailVerified ? 'success' : 'warning'} dot>
            {profile?.emailVerified ? 'Vérifié' : 'Non vérifié'}
          </Badge>
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl border border-ink-200">
          <div>
            <p className="text-sm font-semibold text-ink-900">Mot de passe</p>
            <p className="text-xs text-ink-400">Chiffré avec argon2id</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => window.location.href='/mot-de-passe-oublie'}>
            Modifier
          </Button>
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl border border-ink-200">
          <div>
            <p className="text-sm font-semibold text-ink-900">Authentification 2 facteurs</p>
            <p className="text-xs text-ink-400">Non activée — recommandée</p>
          </div>
          <Button size="sm" disabled>Bientôt disponible</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Section Notifications ────────────────────────────────────────────────────
function NotificationsSection() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await updateProfile.mutateAsync({ marketingOptin: !profile?.marketingOptin });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-ink-950 mb-4">Préférences de notifications</h2>
      <div className="flex flex-col gap-4">
        {[
          { label: 'Distributions de revenus',        desc: 'Alerté à chaque versement',             checked: true,  disabled: true  },
          { label: 'Nouvelles opportunités',            desc: 'Nouveaux actifs en financement',        checked: true,  disabled: true  },
          { label: 'Évolution du portefeuille',        desc: 'Mises à jour mensuelles',               checked: true,  disabled: true  },
          { label: 'Renouvellement KYC',               desc: 'Rappels avant expiration',              checked: true,  disabled: true  },
          { label: 'Offres promotionnelles (optionnel)', desc: 'Actualités et offres spéciales',      checked: profile?.marketingOptin ?? false, disabled: false },
        ].map(({ label, desc, checked, disabled }) => (
          <Checkbox
            key={label}
            label={label}
            description={desc}
            checked={checked}
            disabled={disabled}
            onChange={disabled ? undefined : handleSave}
          />
        ))}
      </div>
      {saved && <p className="mt-4 text-sm text-status-success">✓ Préférences enregistrées.</p>}
    </div>
  );
}

// ─── Section Bancaire ─────────────────────────────────────────────────────────
function BankingSection() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [iban, setIban]   = useState('');
  const [success, setSuc] = useState(false);
  const [error, setErr]   = useState<string | null>(null);

  const handleSave = async () => {
    setErr(null); setSuc(false);
    try {
      await updateProfile.mutateAsync({ iban: iban || undefined });
      setSuc(true);
      setTimeout(() => setSuc(false), 3000);
    } catch (err) {
      setErr(err instanceof ApiError ? err.message : 'IBAN invalide.');
    }
  };

  const displayIban = iban || profile?.iban || '';

  return (
    <div>
      <h2 className="text-lg font-bold text-ink-950 mb-4">Informations bancaires</h2>
      {profile?.iban && (
        <div className="p-4 rounded-xl border border-status-success/30 bg-status-success-bg/20 mb-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-status-success shrink-0" />
          <p className="text-xs text-ink-700">IBAN enregistré et validé pour les versements de revenus.</p>
        </div>
      )}
      <div className="flex flex-col gap-4">
        <Input
          label="IBAN"
          value={displayIban}
          onChange={e => setIban(e.target.value)}
          placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
        />
        <Input label="Titulaire du compte" value={profile?.name ?? ''} readOnly disabled />
      </div>
      {error && <p className="mt-3 text-sm text-status-danger">{error}</p>}
      {success && <p className="mt-3 text-sm text-status-success">✓ IBAN mis à jour.</p>}
      <div className="mt-6 flex justify-end">
        <Button loading={updateProfile.isPending} onClick={handleSave}>
          Mettre à jour l'IBAN
        </Button>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export function ProfilePage() {
  const [active, setActive] = useState<Section>('personal');
  const { user, logout }    = useAuth();
  const { data: profile }   = useProfile();

  const initials = (profile?.name ?? user?.email ?? '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="container-content py-6">
      <h1 className="text-2xl font-bold text-ink-950 mb-6">Mon profil</h1>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6 items-start">
        {/* Sidebar */}
        <nav className="rounded-2xl bg-white border border-ink-200 shadow-card overflow-hidden">
          <div className="flex flex-col items-center gap-2 py-6 px-4 border-b border-ink-100 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-xl font-bold text-white">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">{profile?.name ?? '…'}</p>
              <p className="text-xs text-ink-400">{user?.email}</p>
            </div>
            <Badge tone={profile?.kycStatus === 'validated' ? 'success' : 'warning'} dot className="text-[10px]">
              {profile?.kycStatus === 'validated' ? 'KYC validé' : 'KYC en attente'}
            </Badge>
          </div>

          <ul>
            {SECTIONS.map(({ id, icon: Icon, label }) => (
              <li key={id}>
                <button onClick={() => setActive(id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    active === id
                      ? 'bg-primary-50 text-primary-700 font-semibold border-r-2 border-primary-600'
                      : 'text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                  <ChevronRight className={`h-4 w-4 ml-auto ${active === id ? 'text-primary-500' : 'text-ink-300'}`} />
                </button>
              </li>
            ))}
          </ul>

          <div className="p-3 border-t border-ink-100">
            <button onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-status-danger hover:bg-status-danger-bg transition-colors">
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </div>
        </nav>

        {/* Contenu */}
        <div className="rounded-2xl bg-white border border-ink-200 shadow-card p-6">
          {active === 'personal'      && <PersonalSection />}
          {active === 'security'      && <SecuritySection />}
          {active === 'notifications' && <NotificationsSection />}
          {active === 'banking'       && <BankingSection />}
        </div>
      </div>
    </div>
  );
}
