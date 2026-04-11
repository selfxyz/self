import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'self-green': '#00C853',
        'self-dark': '#0A0A0A',
      },
    },
  },
  plugins: [],
};

export default config;
