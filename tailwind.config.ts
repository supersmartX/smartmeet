import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9ecff",
          200: "#b6d8ff",
          300: "#8fc1ff",
          400: "#62a6ff",
          500: "#3aa0ff",
          600: "#6c6cff",
          700: "#a355ff",
          800: "#d042e8",
          900: "#ff3aa3",
        },
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #3aa0ff 0%, #6c6cff 50%, #ff3aa3 100%)",
      },
      boxShadow: {
        glow: "0 10px 40px rgba(98, 166, 255, 0.35), 0 10px 60px rgba(255, 58, 163, 0.25)",
      },
    },
  },
  plugins: [],
}

export default config
