import { z } from 'zod';

// ─── Schéma informations personnelles (S04) ───────────────────────────────
export const personalInfoSchema = z.object({
  firstName:          z.string().min(1, 'Prénom requis').max(80),
  lastName:           z.string().min(1, 'Nom requis').max(80),
  dateOfBirth:        z.string().min(1, 'Date de naissance requise'),
  nationality:        z.string().min(1, 'Nationalité requise'),
  countryOfResidence: z.string().min(1, 'Pays de résidence requis'),
  phone:              z.string().min(7, 'Numéro de téléphone invalide'),
  email:              z.string().email('Email invalide'),
});
export type PersonalInfoValues = z.infer<typeof personalInfoSchema>;

// ─── Schéma source des fonds (S24) ────────────────────────────────────────
export const sourceOfFundsSchema = z.object({
  fundSource: z.enum(
    ['salary', 'savings', 'investment', 'inheritance', 'business', 'other'],
    { required_error: 'Veuillez sélectionner une source de revenus' },
  ),
  monthlyIncome: z.enum(
    ['<1000', '1000-3000', '3000-7000', '7000-15000', '>15000'],
    { required_error: 'Veuillez sélectionner une tranche' },
  ),
  wealthOriginDetails: z.string().optional(),
});
export type SourceOfFundsValues = z.infer<typeof sourceOfFundsSchema>;

// ─── Options de nationalité ───────────────────────────────────────────────
export const NATIONALITY_OPTIONS = [
  { value: 'FR', label: '🇫🇷 Française' },
  { value: 'CH', label: '🇨🇭 Suisse' },
  { value: 'BE', label: '🇧🇪 Belge' },
  { value: 'DE', label: '🇩🇪 Allemande' },
  { value: 'LU', label: '🇱🇺 Luxembourgeoise' },
  { value: 'IT', label: '🇮🇹 Italienne' },
  { value: 'ES', label: '🇪🇸 Espagnole' },
  { value: 'GB', label: '🇬🇧 Britannique' },
  { value: 'OTHER', label: 'Autre' },
] as const;

// ─── Étapes KYC ───────────────────────────────────────────────────────────
export const KYC_STEPS = [
  { label: 'Informations personnelles' },
  { label: 'Pièce d\'identité'        },
  { label: 'Selfie / Vérification faciale' },
  { label: 'Justificatif de domicile' },
  { label: 'Source des fonds'         },
  { label: 'Revue et validation'      },
] as const;

export type KycStep = typeof KYC_STEPS[number];
