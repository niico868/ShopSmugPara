/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light theme: the ink scale runs from page background (950) to strong text (200).
        ink: { 950: '#ffffff', 900: '#f6f6f4', 800: '#ebebe8', 700: '#dcdcd8', 600: '#b9b9b4', 400: '#6b6b6b', 200: '#2b2b2b' },
        // Brand blue ("Caribbean electric"). Kept under the old name so existing classes pick it up.
        acid: { DEFAULT: '#5caedb', dark: '#3a8fc0' },
        flame: '#e5484d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        poster: ['"Archivo Black"', '"Bebas Neue"', 'Impact', 'sans-serif'],
      },
      borderRadius: { xl: '6px', '2xl': '8px', '3xl': '10px' },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        fly: {
          '0%': { transform: 'translate(-12vw, 0)' },
          '25%': { transform: 'translate(22vw, -40px)' },
          '50%': { transform: 'translate(50vw, 10px)' },
          '75%': { transform: 'translate(80vw, -30px)' },
          '100%': { transform: 'translate(115vw, 0)' },
        },
        flap: { '0%,100%': { transform: 'scaleY(1)' }, '50%': { transform: 'scaleY(-.55)' } },
        rise: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { marquee: 'marquee 30s linear infinite', fly: 'fly 14s linear infinite', flap: 'flap .32s ease-in-out infinite', rise: 'rise .5s ease both' },
    },
  },
  plugins: [],
}
