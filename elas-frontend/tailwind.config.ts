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
        surface: "var(--surface)",
        "surface-subtle": "var(--surface-subtle)",
        border: "var(--border)",
        fg: "var(--text)",
        muted: "var(--muted)",

        // primary as RGB tokens
        primary: "rgb(var(--primary))",
        "primary-hover": "rgb(var(--primary-hover))",
        "primary-muted": "var(--primary-muted)",

        // states
        success: "rgb(var(--success))",
        warning: "rgb(var(--warning))",
        error: "rgb(var(--error))",
      },
      borderRadius: {
        "elas": "var(--radius)",
        "elas-lg": "var(--radius-lg)",
        "elas-pill": "var(--radius-pill)",
      },
      extend: {
  // ...
  boxShadow: {
    soft: "var(--shadow-soft)",
    card: "var(--shadow-card)",
    "soft-dark": "var(--shadow-soft)",
    glow: "0 0 0 1px rgba(142,91,255,0.28), 0 12px 35px rgba(142,91,255,0.16)",
  },
},
      maxWidth: {
        "elas-page": "1200px",
      },
    },
  },
  plugins: [],
};

export default config;