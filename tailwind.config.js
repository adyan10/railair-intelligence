/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#020817',
          900: '#0a0f1e',
          800: '#0f1629',
          700: '#141d36',
          600: '#1a2540',
          500: '#1e2d4d',
          400: '#263659',
        },
        charcoal: {
          900: '#0d0d0d',
          800: '#141414',
          700: '#1c1c1c',
          600: '#232323',
        },
        cyan: {
          DEFAULT: '#06b6d4',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        rail: {
          navy: '#17365D',
          deep: '#0F233D',
          light: '#EAF0F6',
          border: '#DCE3EA',
          bg: '#F5F6F8',
          text: '#192734',
          muted: '#64748B',
        },
        railway: {
          navy: '#17365D',
          dark: '#122b4a',
          canvas: '#F5F6F8',
          border: '#DCE3EA',
          text: '#192734',
          muted: '#64748B',
          card: '#FFFFFF',
        },
        cpcb: {
          good: '#059669',
          mod: '#F59E0B',
          poor: '#EA580C',
          severe: '#DC2626',
        },
        surface: {
          DEFAULT: '#f8f9fb',
          card: '#ffffff',
          border: '#e4e7ec',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      dropShadow: {
        'xs': '0 1px 1px rgba(0, 0, 0, 0.05)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
