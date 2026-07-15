import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // identidade Baby Talks (azul-escuro dos cards especiais do link-da-bio)
        ink: "#232E4C",
        brand: "#38477A",
        accent: "#c5f02c",
      },
    },
  },
  plugins: [],
} satisfies Config;
