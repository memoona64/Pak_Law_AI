/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        espresso: {
          DEFAULT: "#2A2F22",
          800: "#363B2C",
          700: "#3A3D2E",
        },
        cream: {
          DEFAULT: "#F7F6F0",
          200: "#F0EFE3",
        },
        taupe: {
          DEFAULT: "#D8D9C8",
          // Darker than the design file's #A89F96 on purpose: that value
          // fails contrast at 2.39:1 on cream. Use this everywhere instead.
          500: "#7A7D68",
        },
        bronze: {
          DEFAULT: "#6B7F5E",
          ink: "#4A5540",
        },
        flag: "#B8543A",
        ok: "#5C8A52",
        sand: "#B9C2A0",
      },
      fontFamily: {
        serif: ["Playfair Display", "serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
}
