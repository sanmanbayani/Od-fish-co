import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/**
 * `vite build` runs in places that have no dev server, and therefore no PORT
 * and no BASE_PATH — Vercel is the case that matters. Only the dev and preview
 * servers need a port, so that requirement is enforced for `command === 'serve'`
 * and the build is left alone. Demanding it unconditionally fails the Vercel
 * build on its very first step, before anything useful has happened.
 *
 * BASE_PATH defaults to '/' for the same reason: Replit serves each artifact
 * under a path prefix, while Vercel serves this app at the domain root.
 */
export default defineConfig(async ({ command }) => {
  const isServe = command === 'serve';

  const rawPort = process.env.PORT;
  if (isServe && !rawPort) {
    throw new Error(
      'PORT environment variable is required but was not provided.',
    );
  }

  const port = rawPort ? Number(rawPort) : undefined;
  if (isServe && (port === undefined || Number.isNaN(port) || port <= 0)) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = process.env.BASE_PATH ?? '/';

  // Replit's editor plugins are development aids and are not installed as
  // runtime dependencies. Importing them lazily keeps a production build on
  // Vercel from needing them at all.
  const isReplitDev =
    process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined;

  const replitPlugins = isReplitDev
    ? [
        await import('@replit/vite-plugin-runtime-error-modal').then((m) =>
          m.default(),
        ),
        await import('@replit/vite-plugin-cartographer').then((m) =>
          m.cartographer({
            root: path.resolve(import.meta.dirname, '..'),
          }),
        ),
        await import('@replit/vite-plugin-dev-banner').then((m) =>
          m.devBanner(),
        ),
      ]
    : [];

  return {
    base: basePath,
    plugins: [react(), tailwindcss(), ...replitPlugins],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        '@assets': path.resolve(
          import.meta.dirname,
          '..',
          '..',
          'attached_assets',
        ),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, 'dist/public'),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
