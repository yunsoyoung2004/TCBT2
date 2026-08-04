import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#F5F7FA",
        surface: "#FFFFFF",
        "surface-subtle": "#F8FAFC",
        "surface-hover": "#F1F5F9",
        "navy-900": "#132A4A",
        "navy-800": "#1B365D",
        "clinical-blue": "#3566AE",
        "clinical-blue-light": "#EAF1FB",
        "ai-violet": "#7357C7",
        "ai-violet-light": "#F0ECFB",
        success: "#27835A",
        "success-light": "#EAF7F0",
        warning: "#B96E18",
        "warning-light": "#FFF5E7",
        critical: "#C23E45",
        "critical-light": "#FDEEEF",
        "text-primary": "#172033",
        "text-secondary": "#526174",
        "text-muted": "#8491A3",
        border: "#DDE4EC",
        "border-strong": "#C8D2DE",
      },
      fontFamily: {
        sans: ["Inter", "Pretendard", "SUIT", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        panel: "10px",
      },
      boxShadow: {
        none: "none",
      },
    },
  },
  plugins: [],
} satisfies Config;
