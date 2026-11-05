
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/gyarados-final/',
  server: {
    port: 5173,
  },
});
