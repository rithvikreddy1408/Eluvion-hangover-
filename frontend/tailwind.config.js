/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Warm dim surfaces ───────────────────── */
        bg: {
          primary:   '#1c1917',   // dark warm stone — main page bg
          secondary: '#211f1d',   // panels, sidebar
          card:      '#28251f',   // card surfaces
          hover:     '#2e2b25',   // hover states
        },
        accent: {
          purple: '#7c6dfa',   // softer indigo — ONE primary accent
          red:    '#f87171',
          amber:  '#fbbf24',
          green:  '#4ade80',
          blue:   '#60a5fa',
        },
        border: {
          dim: '#3a3530',   // subtle dark borders
          mid: '#4a4540',   // medium dark borders
        },
        /* ── Dark warm zinc ── */
        zinc: {
          50:  '#f2ede7',
          100: '#d4cfc9',
          200: '#a89f97',
          300: '#7d7670',
          400: '#5c5750',
          500: '#454039',
          600: '#353028',
          700: '#2a2620',
          800: '#211e19',
          900: '#1a1715',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:    ['11px', { lineHeight: '16px' }],
        sm:    ['13px', { lineHeight: '20px' }],
        base:  ['14px', { lineHeight: '22px' }],
      },
      boxShadow: {
        sm:  '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        md:  '0 4px 12px rgba(0,0,0,0.1)',
        lg:  '0 8px 24px rgba(0,0,0,0.12)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.15s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
        shimmer:    'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
}
