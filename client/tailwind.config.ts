import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'ui-black': '#1a1a2e',
        ocean: {
          deep: '#0A2472',
          mid: '#1E5AA0',
          light: '#3A87C4',
          surface: '#6DB3E6',
        },
        storm: {
          dark: '#2D3047',
          mid: '#5C5F6E',
          light: '#8C8F9E',
        },
        warning: {
          red: '#D62828',
          orange: '#F77F00',
        },
        accent: {
          yellow: '#FFD166',
          green: '#06D6A0',
        },
      },
      fontFamily: {
        display: ['"Fredoka One"', 'cursive', 'sans-serif'],
        body: ['"Nunito"', 'sans-serif'],
      },
      borderWidth: {
        '1': '1px',
        '3': '3px',
      },
      boxShadow: {
        retro: '4px 4px 0px 0px #000000',
        'retro-hover': '6px 6px 0px 0px #000000',
        'retro-active': '1px 1px 0px 0px #000000',
      },
    },
  },
  plugins: [],
} satisfies Config;
