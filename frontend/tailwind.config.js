/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans"', 'sans-serif'],
      },
      animation: {
        'cipher': 'cipher 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },
      keyframes: {
        cipher: {
          '0%': { filter: 'blur(4px)', opacity: '0', transform: 'translateY(4px)' },
          '100%': { filter: 'blur(0)', opacity: '1', transform: 'translateY(0)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateY(800%)', opacity: '0' }
        }
      }
    },
  },
  plugins: [],
}
