/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        stellar: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c0d3ff',
          300: '#93b4ff',
          400: '#6090ff',
          500: '#3366ff',
          600: '#1a4af5',
          700: '#1236e0',
          800: '#152db5',
          900: '#172a8e',
          950: '#111a5a',
        },
        gold: {
          400: '#f5c842',
          500: '#e8b820',
          600: '#c99a00',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
