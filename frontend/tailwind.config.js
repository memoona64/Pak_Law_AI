/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        espresso: {
          DEFAULT: "#2C221E",
          800: "#3A2E28",
          700: "#4A3C34",
        },
        cream: {
          DEFAULT: "#F8F5F0",
          200: "#EFEAE1",
        },
        taupe: {
          DEFAULT: "#D3C5BD",
          // Darker than the design file's #A89F96 on purpose: that value
          // fails contrast at 2.39:1 on cream. Use this everywhere instead.
          500: "#7D7268",
        },
        bronze: {
          DEFAULT: "#8C6D53",
          ink: "#6E5540",
        },
        flag: "#B8543A",
        ok: "#5A7A4E",
        sand: "#D6BFA8",
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
