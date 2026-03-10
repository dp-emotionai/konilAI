import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "strip-light": "var(--strip-light)",
        surface: "var(--surface)",
        "surface-subtle": "var(--surface-subtle)",
        border: "var(--border)",
        fg: "var(--text)",
        muted: "var(--muted)",
        "muted-2": "var(--muted-2)",
        primary: "rgb(var(--primary))",
        "primary-hover": "rgb(var(--primary-hover))",
        "primary-muted": "var(--primary-muted)",
        success: "rgb(var(--success))",
        warning: "rgb(var(--warning))",
        error: "rgb(var(--error))",
        ring: "var(--ring)",
      },
      borderRadius: {
        elas: "var(--radius)",
        "elas-sm": "var(--radius-sm)",
        "elas-lg": "var(--radius-lg)",
        "elas-xl": "var(--radius-xl)",
        "elas-pill": "var(--radius-pill)",
      },
      spacing: {
        "elas-1": "var(--space-1)",
        "elas-2": "var(--space-2)",
        "elas-3": "var(--space-3)",
        "elas-4": "var(--space-4)",
        "elas-5": "var(--space-5)",
        "elas-6": "var(--space-6)",
        "elas-8": "var(--space-8)",
        "elas-10": "var(--space-10)",
        "elas-12": "var(--space-12)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
        "card-rich": "var(--shadow-card-rich)",
        elevated: "var(--shadow-elevated)",
        glow: "0 0 0 1px rgba(142,91,255,0.22), 0 8px 32px rgba(142,91,255,0.14)",
      },
      maxWidth: {
        "elas-page": "1200px",
      },
    },
  },
  plugins: [],
};

export default config;