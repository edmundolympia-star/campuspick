import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        paper: "#fbfbf8",
        mist: "#f1f1ed",
        line: "#e4e4df",
        matcha: "#58724d",
        tomato: "#c9583c",
        wasabi: "#d9e7bf"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(17, 17, 17, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
