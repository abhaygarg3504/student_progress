import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react({ jsxRuntime: 'automatic',}), tailwindcss()],
  resolve: {
    alias: {
      // Force all imports to reference the root React
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
      recharts: path.resolve(__dirname, 'node_modules/recharts'),
      'react-heatmap-grid': path.resolve(
        __dirname,
        'node_modules/react-heatmap-grid'
      ),
    },
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'recharts',
      'react-heatmap-grid',
    ],
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'recharts',
      'react-heatmap-grid',
    ],
  },
})
