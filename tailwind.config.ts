import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F7F6FB",
        ink: "#1E1A2E",
        line: "#E3DFEE",
        charcoal: "#100D18",
        primary: {
          DEFAULT: "#6C3FA6",
          dark: "#4B2170",
        },
        amber: {
          DEFAULT: "#C98A3B",
          light: "#F0DCC0",
        },
      },
      fontFamily: {
        display: ["var(--font-poppins)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
