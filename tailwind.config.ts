import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#08090b",
        panel: "#111317",
        line: "#252930",
        muted: "#8a909b",
        accent: "#e5e7eb"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(0,0,0,.28)"
      }
    }
  },
  plugins: [require("@tailwindcss/forms")],
};
export default config;
