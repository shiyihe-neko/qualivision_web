
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standard configuration for web deployment
export default defineConfig({
  plugins: [react()],
  // 'base' is usually '/' for standard web deployments
  base: '/', 
})
