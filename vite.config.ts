import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  /* not a git checkout — leave as "unknown" */
}

export default defineConfig({
  base: '/rogoweb/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_COMMIT__: JSON.stringify(commit),
  },
  plugins: [
    tailwindcss(),
    {
      name: 'configure-response-headers',
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
          next();
        });
      },
      configurePreviewServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
          next();
        });
      },
    },
  ],
  test: {
    // Fast unit tests only. The e2e suite (e2e/**/*.e2e.ts) runs under its own
    // config (vitest.config.e2e.ts) because it boots a dev server + Chromium.
    include: ['src/**/*.spec.ts', 'scripts/**/*.spec.ts'],
  },
});
