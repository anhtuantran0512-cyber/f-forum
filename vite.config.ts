import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { forumServerPlugin, securityBootPlugin } from './server/forumPlugin.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  /*
   * Vite does not automatically expose non-VITE_ variables through process.env.
   * The server plugin uses FFORUM_* secrets, so load them explicitly before its
   * configureServer hook imports the backend. Never expose these values through
   * import.meta.env; Vite keeps its normal VITE_ client prefix.
   */
  const serverEnv = loadEnv(mode, process.cwd(), '')
  Object.entries(serverEnv).forEach(([key, value]) => {
    if (process.env[key] === undefined) process.env[key] = value
  })

  return {
    plugins: [
      react(),
      tailwindcss(),
      forumServerPlugin(),
      securityBootPlugin(),
    ],
    server: {
      host: '0.0.0.0', // Listen on all network interfaces
      port: 5173,
      strictPort: true,
      allowedHosts: true, // Allow any incoming tunnel hostname (localtunnel, cloudflare)
      cors: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-lucide'
            }
          },
          /*
           * EPIC 5 — khoá console ở bản production: minifier Oxc loại bỏ MỌI lệnh
           * `console.*` và `debugger` khỏi bundle (Vite trải `output` sau giá trị
           * minify mặc định nên cấu hình này được dùng). Bản dev không qua bước này.
           */
          minify: {
            compress: { dropConsole: true, dropDebugger: true },
            mangle: true,
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  }
})
