import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version?: string }
const appVersion = packageJson.version ?? '0.0.0'

// https://vite.dev/config/
export default defineConfig({
  base: '/Loadout/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    // Listen on all network interfaces (0.0.0.0) to allow access from mobile devices
    host: '0.0.0.0',
    // Port for the development server
    port: 5174,
    // Allow Vite to use the next free port if this one is in use
    strictPort: false,
    // Disable HMR for better mobile Safari compatibility
    hmr: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: false,
  },
})
