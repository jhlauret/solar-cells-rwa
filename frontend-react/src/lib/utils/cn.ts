import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utilitaire de composition de classes Tailwind.
 * Combine clsx (classes conditionnelles) + tailwind-merge (déduplication).
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary-600', 'text-white')
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
