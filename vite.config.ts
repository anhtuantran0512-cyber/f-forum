import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  // Load only required server-side configuration; VITE_ values are public and
  // FFORUM_ secrets are never injected into browser code.
  const loadedEnv = loadEnv(mode, process.cwd(), '')
  const serverEnvNames = [
    'FFORUM_DATA_DIR',
    'FFORUM_TRUST_CLOUDFLARE_PROXY',
    'FFORUM_GOOGLE_CLIENT_ID',
    'FFORUM_FACEBOOK_APP_ID',
    'FFORUM_FACEBOOK_APP_SECRET',
    'VITE_GOOGLE_CLIENT_ID',
    'VITE_FACEBOOK_APP_ID',
  ]
  for (const name of serverEnvNames) {
    if (!process.env[name] && loadedEnv[name]) process.env[name] = loadedEnv[name]
  }

  const { forumServerPlugin } = await import('./server/forumPlugin.ts')
  return {
    plugins: [
      react(),
      tailwindcss(),
      forumServerPlugin(),
    ],
    server: {
      host: '0.0.0.0', // Listen on all network interfaces
      port: 5173,
      strictPort: true,
      allowedHosts: ['.e2b.app', '.loca.lt', '.trycloudflare.com', 'localhost', '127.0.0.1'],
      fs: {
        deny: ['**/data/**'], // Never serve private persisted account/forum data from the project root.
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-lucide'
            }
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  }
})
