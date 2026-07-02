/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Warm dim surfaces ───────────────────── */
        bg: {
          primary:   '#e2dcd3',   // warm stone canvas — main page bg
          secondary: '#e9e3da',   // panels, sidebar
          card:      '#eee8df',   // card surfaces (warm off-white, not pure white)
          hover:     '#dbd5cc',   // hover states
        },
        accent: {
          purple: '#4f46e5',   // indigo-600 — ONE primary accent
          red:    '#dc2626',
          amber:  '#d97706',
          green:  '#16a34a',
          blue:   '#2563eb',
        },
        border: {
          dim: '#c8c3b8',   // warm subtle borders
          mid: '#b4afa4',   // warm medium borders
        },
        /* ── Warm zinc overrides (replaces cold defaults) ── */
        zinc: {
          50:  '#f2ede7',
          100: '#e9e3db',
          200: '#d8d2ca',
          300: '#c0b9b0',
          400: '#948e85',
          500: '#706a62',
          600: '#545048',
          700: '#3a3730',
          800: '#272521',
          900: '#1a1815',
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
