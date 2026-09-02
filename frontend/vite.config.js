import { defineConfig, loadEnv } from 'vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const useHttps = env.VITE_HTTPS === 'true';
  const backendHost = env.VITE_BACKEND_HOST || '127.0.0.1';
  const backendTarget = `http://${backendHost}:8000`;
  const certificateFile = env.VITE_HTTPS_CERT_FILE;
  const keyFile = env.VITE_HTTPS_KEY_FILE;

  if (Boolean(certificateFile) !== Boolean(keyFile)) {
    throw new Error('Set both VITE_HTTPS_CERT_FILE and VITE_HTTPS_KEY_FILE for LAN HTTPS.');
  }

  const customHttps = certificateFile && keyFile
    ? {
        cert: readFileSync(resolve(process.cwd(), certificateFile)),
        key: readFileSync(resolve(process.cwd(), keyFile)),
      }
    : null;

  return {
    plugins: [react(), tailwindcss(), ...(useHttps && !customHttps ? [basicSsl()] : [])],
    server: {
      host: '0.0.0.0',
      https: customHttps || useHttps,
      proxy: env.VITE_USE_VITE_PROXY === 'true' ? {
        '/api': { target: backendTarget, changeOrigin: true },
        '/ws': { target: backendTarget, ws: true, changeOrigin: true },
        '/generated_audio': { target: backendTarget, changeOrigin: true },
      } : undefined,
    },
  };
})
