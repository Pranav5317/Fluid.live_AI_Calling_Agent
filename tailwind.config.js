/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        linen: {
          50: '#FDFBF7',
          100: '#FAF5EE',
          200: '#F5EADB',
          300: '#EDE0CC',
          400: '#E2D1B8',
          500: '#D5BE9E',
          600: '#BFA47F',
        },
        navy: {
          800: '#142555',
          900: '#0C1D4A',
          950: '#071230',
        },
        cobalt: {
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
        },
        brand: {
          50: '#F0F5FF',
          100: '#E0EAFF',
          200: '#C3D5FF',
          300: '#96B5FF',
          400: '#608AFF',
          500: '#1D4ED8',
          600: '#1E40AF',
          700: '#1E3A8A',
          800: '#172554',
          900: '#0C1D4A',
          950: '#071230',
        },
        surface: {
          50: '#FDFBF7',
          100: '#FAF5EE',
          200: '#F5EADB',
          300: '#E7D9C7',
          400: '#D8C7B0',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#1E293B',
          900: '#0F172A',
        }
      },
      fontFamily: {
        display: [
          '"Armany"',
          '"Cormorant Garamond"',
          'Georgia',
          'serif',
        ],
        sans: [
          '"DM Sans"',
          '"Plus Jakarta Sans"',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        body: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'dropdown': '0 4px 12px -2px rgba(15, 23, 42, 0.12), 0 2px 4px -2px rgba(15, 23, 42, 0.08)',
        'modal': '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
      }
    },
  },
  plugins: [],
}

