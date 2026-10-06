import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    origin: 'http://localhost:5173',
    cors: { origin: ['http://localhost:8080', 'http://localhost:18080'] },
  },
  build: {
    manifest: true,
    rolldownOptions: { input: 'src/main.tsx' },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
  },
});
