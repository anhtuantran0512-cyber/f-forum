import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { forumServerPlugin } from './server/forumPlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    forumServerPlugin(),
  ],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    strictPort: true,
    allowedHosts: true, // Allow any incoming tunnel hostname (localtunnel, cloudflare)
    cors: true,
  },
})
