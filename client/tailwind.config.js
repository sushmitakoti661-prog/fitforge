/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF5722',
        secondary: '#FF8C42',
        'dark-bg': '#0D0D0D',
        'dark-card': '#1C1C1E',
        'dark-border': '#2C2C2E',
        success: '#22C55E',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
}

