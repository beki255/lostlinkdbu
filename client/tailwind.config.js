/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9fb',
          100: '#d9f1f6',
          200: '#bce6ef',
          300: '#8ed4e3',
          400: '#3dbbd2',
          500: '#3dbbd2', // Sky Blue
          600: '#319eb3',
          700: '#2a8193',
          800: '#276a79',
          900: '#245967',
        },
        'dbu-blue': '#3DBBD2',
        'dbu-gold': '#FCDD4F',
        'dbu-green': '#287F40',
        'dbu-red': '#E52D2D',
        'dbu-navy': '#1A237E',
        'dbu-beige': '#FFF9E1',
        'dbu-beige-light': 'rgba(255, 249, 225, 0.2)',
        'dbu-black': '#000000',
        'dbu-white': '#FFFFFF',
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
