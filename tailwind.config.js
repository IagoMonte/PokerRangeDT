/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0A0E14',
          secondary: '#141922',
          tertiary: '#1C2230',
        },
        border: {
          subtle: '#252B3B',
          active: '#3A4255',
        },
        text: {
          primary: '#E6EDF3',
          secondary: '#8B949E',
           muted: '#7A828E',

        },
        action: {
          primary: '#7C93FF',
          call: '#5FB4A5',
          fold: '#E06C75',
          raise: '#E5A84B',
          allin: '#C678DD',
        },
        feedback: {
          success: '#5FB4A5',
          error: '#E06C75',
          info: '#7C93FF',
        }
      },
       fontFamily: {
         sans: ['Inter', 'Geist Sans', 'sans-serif'],
         mono: ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
       },
       fontVariantNumeric: ['tabular-nums'],

    },
  },
  plugins: [],
}
