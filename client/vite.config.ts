import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Alle Anfragen an /api leitet Vite an den Express-Server weiter.
    // So laufen Oberfläche und API für den Browser unter derselben Adresse.
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
});
