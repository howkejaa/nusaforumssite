/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: {
          canvas: '#0E1013',
          surface: '#15181E',
          raised: '#1C2028',
          hover: '#222731'
        },
        ink: {
          primary: '#F4F5F7',
          secondary: '#9BA1AE',
          muted: '#68707E'
        },
        accent: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB'
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
