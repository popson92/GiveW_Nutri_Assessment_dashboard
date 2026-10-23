/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7f4',
          100: '#d9ede3',
          200: '#b5dbc9',
          300: '#85c3a6',
          400: '#56a681',
          500: '#368966',
          600: '#276e51',
          700: '#205842',
          800: '#1b4736',
          900: '#173b2d',
        },
        accent: {
          50: '#fff8ed',
          100: '#ffefd4',
          200: '#ffdba8',
          300: '#ffc070',
          400: '#ff9b38',
          500: '#ff7d11',
          600: '#f06107',
          700: '#c74808',
          800: '#9e390f',
          900: '#7f3110',
        },
        risk: {
          low: '#22c55e',
          moderate: '#f59e0b',
          high: '#ef4444',
          critical: '#991b1b',
        },
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
