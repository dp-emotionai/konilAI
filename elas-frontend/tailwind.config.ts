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
        "elas-lg": "var(--radius-lg)",
        "elas-pill": "var(--radius-pill)",
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