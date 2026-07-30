/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#18231f',
        paper: '#f4f1e8',
        moss: '#52675d',
        clay: '#b75d45',
        amber: '#c5913f',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        serif: ['Noto Serif SC', 'Source Han Serif SC', 'serif'],
      },
      boxShadow: { soft: '0 16px 45px rgba(24, 35, 31, 0.08)' },
    },
  },
  plugins: [],
}
