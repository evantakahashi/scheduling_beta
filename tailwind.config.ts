import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // HUD Theme Colors
        hud: {
          primary: "#00f0ff",
          secondary: "#ff00aa",
          success: "#00ff88",
          warning: "#ffaa00",
          danger: "#ff0044",
        },
        // Darkness/Anti-Vision
        darkness: {
          bg: "#1a0a0a",
          text: "#ff2222",
        },
        // Shadcn compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        hud: ["var(--font-orbitron)", "JetBrains Mono", "monospace"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "scan-line": "scan-line 8s linear infinite",
        "damage-flash": "damage-flash 0.3s ease-out",
        "float-up": "float-up 1.5s ease-out forwards",
        "slide-out-right": "slide-out-right 0.5s ease-out forwards",
        "fire-flicker": "fire-flicker 0.5s ease-in-out infinite",
        "glitch": "glitch 0.3s ease-in-out",
        "darkness-pulse": "darkness-pulse 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.8" },
          "50%": { opacity: "1" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "damage-flash": {
          "0%": { backgroundColor: "rgba(255, 0, 68, 0.8)" },
          "100%": { backgroundColor: "transparent" },
        },
        "float-up": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-40px)" },
        },
        "slide-out-right": {
          "0%": { opacity: "1", transform: "translateX(0)" },
          "100%": { opacity: "0", transform: "translateX(100px)" },
        },
        "fire-flicker": {
          "0%, 100%": { textShadow: "0 0 4px #ff6600, 0 0 8px #ff3300" },
          "50%": { textShadow: "0 0 8px #ff6600, 0 0 16px #ff3300, 0 0 24px #ff0000" },
        },
        "glitch": {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
          "100%": { transform: "translate(0)" },
        },
        "darkness-pulse": {
          "0%, 100%": { opacity: "var(--darkness-base)" },
          "50%": { opacity: "var(--darkness-peak)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
