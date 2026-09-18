/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05070d',
          900: '#080b14',
          850: '#0b1020',
          800: '#0f1525',
          700: '#161d33',
          600: '#1e2742',
          500: '#2a3556',
          400: '#3a466e',
        },
        cyan: {
          glow: '#22d3ee',
          DEFAULT: '#06b6d4',
          deep: '#0891b2',
        },
        safe: '#22c55e',
        caution: '#f59e0b',
        high: '#fb923c',
        critical: '#ef4444',
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)',
        'radial-glow':
          'radial-gradient(ellipse at top, rgba(6,182,212,0.12), transparent 60%)',
      },
      backgroundSize: {
        grid: '48px 48px',
      },
      boxShadow: {
        glow: '0 0 40px rgba(34,211,238,0.15)',
        'glow-sm': '0 0 20px rgba(34,211,238,0.1)',
        card: '0 8px 32px rgba(0,0,0,0.4)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 2s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        scan: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
};
