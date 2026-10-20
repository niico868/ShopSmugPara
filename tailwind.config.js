/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0b0b0c', 900: '#121214', 800: '#1a1a1d', 700: '#26262b', 600: '#3a3a41', 400: '#8a8a94', 200: '#d4d4d8' },
        acid: { DEFAULT: '#c6ff3d', dark: '#a3d921' },
        flame: '#ff5c39',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        poster: ['"Bebas Neue"', 'Impact', 'sans-serif'],
      },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        rise: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { marquee: 'marquee 30s linear infinite', rise: 'rise .5s ease both' },
    },
  },
  plugins: [],
}
