import forms from '@tailwindcss/forms';
import defaultTheme from 'tailwindcss/defaultTheme';
import { colores } from './src/colores.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Figtree', ...defaultTheme.fontFamily.sans] },
      colors: colores,
    },
  },
  plugins: [forms],
};
