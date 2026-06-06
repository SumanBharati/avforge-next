import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core backgrounds (RGB channels — support Tailwind opacity modifiers)
        forge: {
          bg: "rgb(var(--forge-bg) / <alpha-value>)",
          panel: "rgb(var(--forge-panel) / <alpha-value>)",
          surface: "rgb(var(--forge-surface) / <alpha-value>)",
          card: "rgb(var(--forge-card) / <alpha-value>)",
          "card-hover": "rgb(var(--forge-card-hover) / <alpha-value>)",
        },
        // Borders
        border: {
          DEFAULT: "rgb(var(--border) / <alpha-value>)",
          light: "rgb(var(--border-light) / <alpha-value>)",
          dark: "rgb(var(--border-dark) / <alpha-value>)",
        },
        // Semantic text colors
        heading: "rgb(var(--text-heading) / <alpha-value>)",
        body: "rgb(var(--text-body) / <alpha-value>)",
        secondary: "rgb(var(--text-secondary) / <alpha-value>)",
        muted: "rgb(var(--text-muted) / <alpha-value>)",
        subtle: "rgb(var(--text-subtle) / <alpha-value>)",
        faint: "rgb(var(--text-faint) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "sans-serif"],
        display: ["var(--font-space-grotesk)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-dot": "pulseDot 1.2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "0.3", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1.2)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
