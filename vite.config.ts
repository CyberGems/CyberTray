import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import electron from 'vite-plugin-electron/simple';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: {
            build: {
              rollupOptions: {
                external: ['electron-updater'],
              },
            },
          },
        },
        preload: {
          input: 'electron/preload.ts',
        },
        renderer: {},
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
