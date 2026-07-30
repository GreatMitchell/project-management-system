/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        moss: 'rgb(var(--color-moss) / <alpha-value>)',
        clay: 'rgb(var(--color-clay) / <alpha-value>)',
        amber: 'rgb(var(--color-amber) / <alpha-value>)',
        app: 'rgb(var(--bg-app) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface) / <alpha-value>)',
        surface2: 'rgb(var(--bg-surface-2) / <alpha-value>)',
        panel: 'rgb(var(--bg-panel) / <alpha-value>)',
        sidebar: 'rgb(var(--bg-sidebar) / <alpha-value>)',
        overlay: 'rgb(var(--bg-overlay) / <alpha-value>)',
        line: 'rgb(var(--border-soft) / <alpha-value>)',
        lineStrong: 'rgb(var(--border-strong) / <alpha-value>)',
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          inverse: 'rgb(var(--text-inverse) / <alpha-value>)',
        },
        accent: {
          primary: 'rgb(var(--accent-primary) / <alpha-value>)',
          secondary: 'rgb(var(--accent-secondary) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
        },
        successTone: 'rgb(var(--success-rgb) / <alpha-value>)',
        warningTone: 'rgb(var(--warning-rgb) / <alpha-value>)',
        dangerTone: 'rgb(var(--danger-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'Inter', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        serif: ['var(--font-display)', 'Noto Serif SC', 'Source Han Serif SC', 'serif'],
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        card: 'var(--shadow-card)',
        glow: 'var(--shadow-glow)',
      },
      borderRadius: {
        skin: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
      },
    },
  },
  plugins: [],
}
