import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "var(--main-bg)",
          hover: "var(--item-hover)",
          secondary: "var(--secondary-bg)",
          surface: "var(--surface)",
          muted: "var(--surface-muted)",
          subtle: "var(--surface-subtle)",
          border: "var(--border)",
          "border-subtle": "var(--border-subtle)",
          primary: "var(--text-primary)",
          secondarytext: "var(--text-secondary)",
          mutedtext: "var(--text-muted)",
          faint: "var(--text-faint)",
          accent: "var(--accent)",
          "accent-hover": "var(--accent-hover)",
          "accent-fg": "var(--accent-fg)",
          overlay: "var(--overlay)",
          input: "var(--input-border)",
          focus: "var(--input-focus)",
          danger: "var(--danger)",
          "danger-hover": "var(--danger-hover)",
          "danger-bg": "var(--danger-bg)",
          "danger-text": "var(--danger-text)",
          success: "var(--success-text)",
          "success-bg": "var(--success-bg)",
        },
      },
      fontFamily: {
        sans: ["Poppins", "Segoe UI", "system-ui", "sans-serif"],
        mono: [
          "ui-monospace",
          "Consolas",
          "Liberation Mono",
          "Menlo",
          "monospace",
        ],
      },
      maxWidth: {
        office: "90rem",
        login: "24rem",
      },
      borderRadius: {
        card: "1rem",
        table: "0.75rem",
        control: "0.5rem",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
        table: "0 4px 6px -1px rgb(0 0 0 / 0.06)",
        modal: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
        sidebar: "rgba(100, 100, 111, 0.2) 0 7px 29px",
        toast: "0 10px 15px -3px rgb(0 0 0 / 0.12), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      },
      transitionDuration: {
        hover: "150ms",
        sidebar: "300ms",
      },
    },
  },
  plugins: [],
};

export default config;
