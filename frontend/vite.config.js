import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const useHttps = env.VITE_HTTPS === 'true';
  const backendHost = env.VITE_BACKEND_HOST || '127.0.0.1';
  const backendTarget = `http://${backendHost}:8000`;

  return {
    plugins: [react(), tailwindcss(), ...(useHttps ? [basicSsl()] : [])],
    server: {
      host: true,
      https: useHttps,
      proxy: env.VITE_USE_VITE_PROXY === 'true' ? {
        '/api': { target: backendTarget, changeOrigin: true },
        '/ws': { target: backendTarget, ws: true, changeOrigin: true },
        '/generated_audio': { target: backendTarget, changeOrigin: true },
      } : undefined,
    },
  };
})
