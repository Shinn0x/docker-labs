import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // For local `npm run dev` outside Docker, proxy API calls to the backend.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
