import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/BLmw3/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
