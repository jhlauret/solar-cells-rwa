import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'adresse e-mail est requise')
    .email('Adresse e-mail invalide'),

  password: z
    .string()
    .min(1, 'Le mot de passe est requis'),

  rememberMe: z.boolean().optional().default(false),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'adresse e-mail est requise')
    .email('Adresse e-mail invalide'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
