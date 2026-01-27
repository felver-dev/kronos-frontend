/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'rgb(var(--primary-soft) / <alpha-value>)',
          100: 'rgb(var(--primary-soft) / <alpha-value>)',
          200: 'rgb(var(--primary-soft) / <alpha-value>)',
          300: 'rgb(var(--primary) / <alpha-value>)',
          400: 'rgb(var(--primary) / <alpha-value>)',
          500: 'rgb(var(--primary) / <alpha-value>)',
          600: 'rgb(var(--primary) / <alpha-value>)',
          700: 'rgb(var(--primary-strong) / <alpha-value>)',
          800: 'rgb(var(--primary-strong) / <alpha-value>)',
          900: 'rgb(var(--primary-strong) / <alpha-value>)',
        },
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '33%': { transform: 'translateY(-20px) translateX(10px)' },
          '66%': { transform: 'translateY(10px) translateX(-15px)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '50%': { transform: 'translateY(-15px) translateX(8px)' },
        },
        floatFast: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '25%': { transform: 'translateY(-25px) translateX(-10px)' },
          '50%': { transform: 'translateY(-10px) translateX(15px)' },
          '75%': { transform: 'translateY(-20px) translateX(-5px)' },
        },
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        'float-slow': 'floatSlow 12s ease-in-out infinite',
        'float-fast': 'floatFast 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
