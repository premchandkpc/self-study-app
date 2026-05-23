import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const webPort = parseInt(env.VITE_PORT || '5173')
  const apiPort = env.VITE_API_PORT || '4000'
  const apiTarget = `http://localhost:${apiPort}`

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: webPort,
      proxy: {
        '/api': apiTarget,
        '/health': apiTarget,
      },
    },
  }
})
