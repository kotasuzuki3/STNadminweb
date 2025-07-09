import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/points': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
});