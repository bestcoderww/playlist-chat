import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Clash Display'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Geist'", "sans-serif"],
      },
      colors: {
        bg: "#080808",
        surface: "#111111",
        border: "#1e1e1e",
        accent: "#C8FF4D",
        "accent-dim": "#9abf39",
        muted: "#444444",
        text: "#f0f0f0",
        "text-muted": "#888888",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
