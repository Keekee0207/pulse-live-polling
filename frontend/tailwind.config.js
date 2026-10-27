/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neoYellow: '#FFE500',
        neoPink: '#FF5C8D',
        neoMint: '#22E5A1',
        neoCyan: '#38BDF8',
        neoPurple: '#C084FC',
        neoOrange: '#FB923C',
        neoBg: '#F8F5EE',
        neoDark: '#121212',
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px 0px #000000',
        'neo': '4px 4px 0px 0px #000000',
        'neo-lg': '6px 6px 0px 0px #000000',
        'neo-xl': '8px 8px 0px 0px #000000',
        'neo-reverse': '-4px -4px 0px 0px #000000',
      },
      borderWidth: {
        '3': '3px',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Cabinet Grotesk', 'Impact', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
