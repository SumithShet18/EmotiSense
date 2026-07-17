/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        background: '#0b0b13',
        foreground: '#f0f0f7',
        card: {
          DEFAULT: '#0f0f1a',
          foreground: '#f0f0f7',
        },
        primary: {
          DEFAULT: '#bf83fc',
          foreground: '#0b0b13',
        },
        secondary: {
          DEFAULT: '#181825',
          foreground: '#f0f0f7',
        },
        muted: {
          DEFAULT: '#1c1c2e',
          foreground: '#94a3b8',
        },
        accent: {
          DEFAULT: '#6a9afb',
          foreground: '#0b0b13',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#f0f0f7',
        },
        border: '#24243a',
        input: '#1c1c2e',
        ring: '#bf83fc',
        emotion: {
          angry: '#ef4444',
          happy: '#22c55e',
          sad: '#3b82f6',
          neutral: '#6b7280',
          excited: '#a855f7',
          frustrated: '#f97316',
        },
      },
      borderRadius: {
        'button': '12px',
        'card': '16px',
        'input': '12px',
        'pill': '9999px',
      },
      boxShadow: {
        'glow': '0 0 40px hsla(270, 95%, 65%, 0.35)',
        'glow-blue': '0 0 40px hsla(220, 95%, 65%, 0.35)',
        'card': '0 8px 32px hsla(240, 30%, 2%, 0.6)',
        'btn': '0 0 30px rgba(166, 81, 252, 0.5), 0 0 60px rgba(81, 137, 251, 0.4)',
      },
      maxWidth: {
        container: '1280px',
      },
      letterSpacing: {
        tight: '-0.025em',
        display: '-1.5px',
        heading: '-1.2px',
        sub: '-0.9px',
        wide: '0.05em',
        wider: '0.1em',
        widest: '0.18em',
      },
      keyframes: {
        'float-y': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'wave': {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'float': 'float-y 6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'wave': 'wave 1.2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
