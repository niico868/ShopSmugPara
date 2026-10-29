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
        sans: ['"Creato Display"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Creato Display"', 'Inter', 'sans-serif'],
        // Bold expanded sans for headers.
        poster: ['"Akira Expanded"', '"Archivo Black"', 'Impact', 'sans-serif'],
        // Smuggler's Paradise blackletter, for brand lines and captions.
        pirate: ['"Jack Pirate"', '"Pirata One"', 'serif'],
      },
      borderRadius: { xl: '6px', '2xl': '8px', '3xl': '10px' },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        rise: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        // The points bin wobbles as a coin lands in it.
        'bin-bump': {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.35) rotate(-10deg)' },
          '60%': { transform: 'scale(.92) rotate(6deg)' },
          '100%': { transform: 'scale(1)' },
        },
        // Toasts appear in place, pause, then drift to the top of the screen and fade, clearing the buttons under them.
        'float-away': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '6%, 65%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(calc(-100vh + 10rem))' },
        },
        // The shared-design tip pops in under the "Design yours" link.
        'pop-in': { from: { opacity: '0', transform: 'translateY(-8px) scale(.85)' }, to: { opacity: '1', transform: 'none' } },
        // The hidden Contraband coin bobs and glints so a sharp eye spots it.
        bob: { '0%, 100%': { transform: 'translateY(0) rotate(-6deg)' }, '50%': { transform: 'translateY(-4px) rotate(6deg)' } },
      },
      animation: { marquee: 'marquee 30s linear infinite', rise: 'rise .5s ease both', 'float-away': 'float-away 7s cubic-bezier(.4,0,.2,1) both', 'bin-bump': 'bin-bump .45s ease-out', 'pop-in': 'pop-in .45s cubic-bezier(.3,1.5,.6,1) .5s both', bob: 'bob 2.4s ease-in-out infinite' },
    },
  },
  plugins: [],
}
