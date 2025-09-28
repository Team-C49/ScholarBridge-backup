/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-light-green': '#DDEB9D',
        'custom-purple': '#898AC4',
        'custom-dark-green': '#3E7C00',
        'custom-off-white': '#FAF9F6', // A neutral background color used in the design
      },
    },
  },
  plugins: [],
}

