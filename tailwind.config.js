module.exports = {
  content: ["src/./**/*.html"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        flama: ['"Flama Condensed"', 'sans-serif'],
      },
      colors: {},
    },
  },
  variants: {},
  plugins: [require("@tailwindcss/typography")],
};
