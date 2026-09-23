/** @type {import('tailwindcss').Config} */

// Helper: a token backed by a CSS variable holding "R G B" channels, so Tailwind
// opacity modifiers (bg-panel/50, ring-accent/30, …) keep working.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      colors: {
        // Brand (kept for backwards-compat; now themed via tokens).
        'fdx-red': token('brand'),
        'fdx-dark': token('panel-strong'),
        'fdx-gray': token('ink-faint'),

        // Surfaces
        app: token('app'),
        panel: token('panel'),
        'panel-soft': token('panel-soft'),
        'panel-strong': token('panel-strong'),

        // Text / ink
        ink: token('ink'),
        'ink-soft': token('ink-soft'),
        'ink-faint': token('ink-faint'),

        // Lines / borders
        line: token('line'),
        'line-soft': token('line-soft'),

        // Brand + interactive accent
        brand: token('brand'),
        'brand-soft': token('brand-soft'),
        accent: token('accent'),
        'accent-soft': token('accent-soft'),
        'accent-fg': token('accent-fg'),

        // Semantic status families (each: strong fg/solid + soft bg)
        ok: token('ok'),
        'ok-soft': token('ok-soft'),
        warn: token('warn'),
        'warn-soft': token('warn-soft'),
        crit: token('crit'),
        'crit-soft': token('crit-soft'),
        info: token('info'),
        'info-soft': token('info-soft'),
        idle: token('idle'),
        'idle-soft': token('idle-soft'),
      },
    },
  },
  plugins: [],
}
