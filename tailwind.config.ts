import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        navy: "#142C52",
        clinical: "#315FAD",
        violet: "#7357C7",
        canvas: "#F6F8FB",
        line: "#DCE3ED",
        muted: "#667085",
        success: "#2F855A",
        warning: "#C47B19",
        critical: "#C24141"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(20,44,82,.04), 0 8px 24px rgba(20,44,82,.04)"
      },
      fontFamily: {
        sans: ["Inter", "Pretendard", "SUIT", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"]
      }
    }
  },
  plugins: []
} satisfies Config;
