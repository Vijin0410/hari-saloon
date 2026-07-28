import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(dirname, 'src'),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api/auth': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api\/auth/, '/auth'),
        },
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
