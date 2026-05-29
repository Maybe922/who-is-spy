import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        paper: "#fbfaf7",
        jade: "#007f73",
        coral: "#c84b31",
        saffron: "#f4b740"
      },
      boxShadow: {
        soft: "0 16px 48px rgba(23, 32, 42, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
