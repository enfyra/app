export default {
  darkMode: "class",
  content: [
    "./components/**/*.{vue,js,ts}",
    "./layouts/**/*.{vue,js,ts}",
    "./pages/**/*.{vue,js,ts}",
    "./app.vue",
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#6D28D9',
          600: '#5B21B6',
          700: '#4c1d95',
          800: '#3b0764',
          900: '#2e1065',
          950: '#1e0a46',
        },
        primary: {
          DEFAULT: '#6D28D9',
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#6D28D9',
          600: '#5B21B6',
          700: '#4c1d95',
          800: '#3b0764',
          900: '#2e1065',
          950: '#1e0a46',
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/aspect-ratio"),
    require("@tailwindcss/typography"),
  ],
};
