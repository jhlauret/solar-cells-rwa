import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      // En développement : proxie /api/v1/* → backend Node.js
      '/api': {
        target:       'http://localhost:3001',
        changeOrigin: true,
        secure:       false,
      },
    },
  },
  build: {
    outDir:    'dist',
    sourcemap: true,
  },
  define: {
    // Permet au code de détecter si on est en mode dev
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
