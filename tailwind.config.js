module.exports = {
  content: [
    "./src/**/*.{html,njk,md}",
  ],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        flama: ['"Flama Condensed"', 'sans-serif'],
        noto: ['"Noto Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#FF3B6A',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            // Use Noto Sans inside prose blocks
            fontFamily: theme('fontFamily.noto').join(', '),
            a: { color: theme('colors.primary') },
          },
        },
      }),
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
