import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('react/')) return 'react';
          if (id.includes('framer-motion') || id.includes('@react-spring')) return 'motion';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('lucide-react')) return 'icons';
        },
      },
    },
  },
  test: {
    // Use jsdom to simulate a browser environment for React components
    environment: 'jsdom',
    // Make describe/it/expect available globally (like Jest)
    globals: true,
    // Auto-import jest-dom matchers (toBeInTheDocument, etc.)
    setupFiles: './src/test-setup.js',
    // Exclude Playwright e2e tests from Vitest
    exclude: ['node_modules', 'e2e/**'],
    // Coverage reporting
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**'],
      exclude: ['src/main.jsx', 'src/**/*.spec.*', 'src/**/__tests__/**'],
    },
  },
})
