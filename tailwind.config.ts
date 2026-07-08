import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#EEF1F0",
        ink: "#1B2430",
        line: "#D8DDD9",
        forest: {
          DEFAULT: "#2F6F4E",
          dark: "#1F4D36",
        },
        amber: {
          DEFAULT: "#C98A3B",
          light: "#F0DCC0",
        },
      },
      fontFamily: {
        display: ["var(--font-source-serif)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
