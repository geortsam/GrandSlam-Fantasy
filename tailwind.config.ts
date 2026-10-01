import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
        background: token("background"),
        foreground: token("foreground"),
        primary: { DEFAULT: token("primary"), foreground: token("primary-foreground") },
        secondary: { DEFAULT: token("secondary"), foreground: token("secondary-foreground") },
        accent: { DEFAULT: token("accent"), foreground: token("accent-foreground") },
        destructive: { DEFAULT: token("destructive"), foreground: token("destructive-foreground") },
        muted: { DEFAULT: token("muted"), foreground: token("muted-foreground") },
        card: { DEFAULT: token("card"), foreground: token("card-foreground") },
        popover: { DEFAULT: token("card"), foreground: token("card-foreground") },
        // Court palette
        grass: { DEFAULT: token("grass"), foreground: token("grass-foreground") },
        hard: { DEFAULT: token("hard"), foreground: token("hard-foreground") },
        clay: { DEFAULT: token("clay"), foreground: token("clay-foreground") },
        live: { DEFAULT: token("live"), foreground: token("live-foreground") },
        positive: token("positive"),
        negative: token("negative"),
        atp: token("atp"),
        wta: token("wta"),
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: { pulseDot: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.35" } } },
      animation: { "pulse-dot": "pulseDot 1.6s ease-in-out infinite" },
    },
  },
  plugins: [animate],
};

export default config;
