/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f0fe',
          100: '#c5d9f8',
          200: '#9ebff3',
          300: '#6fa4ed',
          400: '#4a8ee9',
          500: '#0057B8',
          600: '#004a9e',
          700: '#003d83',
          800: '#003069',
          900: '#00234f',
        },
        accent: {
          gold: '#F5A623',
          green: '#28A745',
          red: '#DC3545',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
