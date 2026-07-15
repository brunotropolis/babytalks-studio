import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Identidade Baby Talks (light oficial)
        lilas: "#8E9BD1",
        "lilas-claro": "#B0BCE5",
        "lilas-esc": "#6F7EB8",
        magenta: "#C95FA3",
        "magenta-suave": "#D89FC4",
        azul: "#1F2A56",
        "azul-suave": "#4A5578",
        branco: "#F8F7F4",
        rosa: "#F4DCE8",
        lavanda: "#E4E6F2",
        verde: "#2EA66C",
        "verde-bright": "#3FBE7E",
      },
      fontFamily: {
        serif: ["Fraunces", "serif"],
        sans: ["'DM Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
