import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import electron from 'vite-plugin-electron/simple';

/**
 * Política de seguridad de contenido del renderer.
 *
 * Solo se aplica en builds de producción: en desarrollo el servidor de Vite
 * necesita scripts en línea (HMR, React Refresh) que la CSP bloquearía.
 *
 * `style-src` incluye 'unsafe-inline' porque la UI aplica estilos en línea
 * (atributos `style`) para el tamaño de los iconos y el color de acento.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: local-resource:",
  "media-src 'self' data: blob: local-resource:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'cybertray:csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: CONTENT_SECURITY_POLICY,
          },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      contentSecurityPolicy(),
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
