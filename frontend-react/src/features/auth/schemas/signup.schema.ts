import { z } from 'zod';

export const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, 'L\'adresse e-mail est requise')
      .email('Adresse e-mail invalide'),

    password: z
      .string()
      .min(8, 'Minimum 8 caractères')
      .regex(/[A-Z]/, 'Au moins une lettre majuscule')
      .regex(/[0-9]/, 'Au moins un chiffre'),

    confirmPassword: z.string().min(1, 'Veuillez confirmer votre mot de passe'),

    countryOfResidence: z
      .string()
      .min(1, 'Veuillez sélectionner votre pays'),

    accountType: z.enum(['individual', 'professional', 'institutional'], {
      required_error: 'Veuillez sélectionner un type de compte',
    }),

    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: 'Vous devez accepter les conditions d\'utilisation' }),
    }),

    acceptedMarketing: z.boolean().optional().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path:    ['confirmPassword'],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

// ─── Options de pays (MVP simplifié) ─────────────────────────────────────
export const COUNTRY_OPTIONS = [
  { value: 'FR', label: '🇫🇷 France' },
  { value: 'CH', label: '🇨🇭 Suisse' },
  { value: 'BE', label: '🇧🇪 Belgique' },
  { value: 'DE', label: '🇩🇪 Allemagne' },
  { value: 'LU', label: '🇱🇺 Luxembourg' },
  { value: 'NL', label: '🇳🇱 Pays-Bas' },
  { value: 'GB', label: '🇬🇧 Royaume-Uni' },
  { value: 'OTHER', label: 'Autre pays' },
] as const;

export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'individual',    label: 'Particulier' },
  { value: 'professional',  label: 'Professionnel' },
  { value: 'institutional', label: 'Institutionnel' },
] as const;
