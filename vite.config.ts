import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/Loadout/',
  plugins: [react()],
  server: {
    // Listen on all network interfaces (0.0.0.0) to allow access from mobile devices
    host: '0.0.0.0',
    // Port for the development server
    port: 5173,
    // Enable strict port (fail if port is in use)
    strictPort: false,
    // Disable HMR for better mobile Safari compatibility
    hmr: false,
  },
})
