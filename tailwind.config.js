/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          base: '#090D16',
          panel: '#0F1623',
          surface: '#161F30',
          hover: '#1E293B',
          border: '#1F293B'
        },
        nusa: {
          blue: '#2563EB',
          blueHover: '#1D4ED8',
          bubbleOut: '#1E3A8A',
          bubbleOutBorder: '#2563EB'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    }
  },
  plugins: []
};
