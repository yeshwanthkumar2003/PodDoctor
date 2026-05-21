/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        display: ['"Inter"', "system-ui", "sans-serif"],
      },
      colors: {
        // Canvas
        bg: {
          DEFAULT: "#0a0e1a",
          deep: "#070a14",
          panel: "#0e1322",
          card: "#111729",
          hover: "#161d33",
        },
        line: {
          DEFAULT: "rgba(255,255,255,0.06)",
          strong: "rgba(255,255,255,0.10)",
        },
        // Single accent + semantic only
        accent: {
          DEFAULT: "#22d3ee",   // cyan-400
          soft: "#67e8f9",
          deep: "#0891b2",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        // Back-compat shims so older imports still resolve
        neon: {
          cyan: "#22d3ee",
          blue: "#38bdf8",
          purple: "#22d3ee",
          violet: "#22d3ee",
          pink: "#22d3ee",
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
        },
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.35)",
        focus: "0 0 0 1px rgba(34,211,238,0.35)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        softPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out both",
        "soft-pulse": "softPulse 2.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
