import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/rogoweb/',
  plugins: [tailwindcss()],
  test: {
    include: ['src/**/*.spec.ts'],
  },
});
