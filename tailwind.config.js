/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'fdx-red': '#FF0000',
        'fdx-dark': '#161F28',
        'fdx-gray': '#ACABA2',
      },
    },
  },
  plugins: [],
}

