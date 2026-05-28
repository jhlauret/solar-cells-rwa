import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ─── Typographie ─────────────────────────────────────────────────────
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },

      // ─── Couleurs ──────────────────────────────────────────────────────
      colors: {
        // Vert SolarCells — extrait des écrans PDF
        primary: {
          50:  '#f0fdf5',
          100: '#dcfce8',
          200: '#bbf7d1',
          300: '#86efad',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a', // ← couleur principale : boutons, badges "En production"
          700: '#15803d', // ← hover
          800: '#166534', // ← dark, header "Cells"
          900: '#14532d',
          950: '#052e16',
          DEFAULT: '#16a34a',
        },
        // Neutres (textes, bordures, fonds)
        ink: {
          950: '#0a0f0d',
          900: '#0f1f18',
          800: '#1a2e23',
          700: '#334a3d',
          600: '#4d6657',
          500: '#6b8878',
          400: '#94b0a3',
          300: '#c2d5cb',
          200: '#dde9e5',
          100: '#eef4f2',
          50:  '#f6faf9',
          DEFAULT: '#1a2e23',
        },
        // Statuts — extraits des badges du PDF
        status: {
          success:        '#16a34a', // "En production" badge
          'success-bg':   '#dcfce8',
          warning:        '#d97706', // "Financement en cours" badge
          'warning-bg':   '#fef3c7',
          info:           '#2563eb',
          'info-bg':      '#dbeafe',
          muted:          '#6b7280', // "À venir" badge
          'muted-bg':     '#f3f4f6',
          danger:         '#dc2626',
          'danger-bg':    '#fee2e2',
        },
      },

      // ─── Ombres ────────────────────────────────────────────────────────
      boxShadow: {
        card:      '0 1px 3px rgba(10,15,13,.06), 0 4px 12px rgba(10,15,13,.08)',
        'card-md': '0 4px 16px rgba(10,15,13,.12)',
        'card-lg': '0 12px 40px rgba(10,15,13,.16)',
        modal:     '0 24px 64px rgba(10,15,13,.24)',
      },

      // ─── Radius ────────────────────────────────────────────────────────
      borderRadius: {
        sm:    '6px',
        DEFAULT:'8px',
        md:    '10px',
        lg:    '12px',
        xl:    '16px',
        '2xl': '20px',
        '3xl': '24px',
      },

      // ─── Espacement max content ────────────────────────────────────────
      maxWidth: {
        content: '1280px',
        prose:   '72ch',
      },

      // ─── Animations ───────────────────────────────────────────────────
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        shimmer: 'shimmer 1.8s infinite linear',
      },
    },
  },
  plugins: [],
} satisfies Config;
