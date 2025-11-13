// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Optional bundle visualizer (will be used only if installed)
  let visualizerPlugin = null;
  if (mode === 'production') {
    try {
      const { visualizer } = await import('rollup-plugin-visualizer');
      visualizerPlugin = visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
      });
    } catch {
      // plugin not installed — skip silently
    }
  }

  const backend = env.VITE_BACKEND_URL || 'http://localhost:8080';

  return {
    plugins: [
      react({ fastRefresh: true, jsxRuntime: 'automatic' }),
      tailwindcss(),
      ...(visualizerPlugin ? [visualizerPlugin] : []),
    ],

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@pages': resolve(__dirname, 'src/pages'),
        '@features': resolve(__dirname, 'src/features'),
        '@store': resolve(__dirname, 'src/store'),
        '@lib': resolve(__dirname, 'src/lib'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@styles': resolve(__dirname, 'src/styles'),
        '@assets': resolve(__dirname, 'src/assets'),
        '@types': resolve(__dirname, 'src/types'),
      },
    },

    server: {
      port: Number(env.VITE_DEV_SERVER_PORT) || 5173,
      host: env.VITE_DEV_SERVER_HOST || 'localhost',
      open: env.VITE_AUTO_OPEN_BROWSER === 'true',
      cors: true,
      proxy: {
        '/api': {
          target: backend,
          changeOrigin: true,
          secure: false,
          // Your Go API has no /api prefix → strip it
          rewrite: (p) => p.replace(/^\/api/, ''),
          configure(proxy) {
            proxy.on('error', (err) => console.log('Proxy error', err));
            proxy.on('proxyReq', (_proxyReq, req) => console.log('→', req.method, req.url));
            proxy.on('proxyRes', (res, req) => console.log('←', res.statusCode, req.url));
          },
        },
      },
      hmr: { overlay: true },
    },

    preview: {
      port: Number(env.VITE_PREVIEW_PORT) || 4173,
      host: env.VITE_PREVIEW_HOST || 'localhost',
      open: env.VITE_AUTO_OPEN_BROWSER === 'true',
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode !== 'production',
      minify: mode === 'production' ? 'esbuild' : false,
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['@headlessui/react', '@heroicons/react'],
            'vendor-state': ['zustand'],
            'vendor-forms': ['react-hook-form', '@hookform/resolvers'],
            'vendor-utils': ['clsx', 'date-fns', 'lodash-es'],
            'vendor-http': ['axios'],
          },
          chunkFileNames: (chunkInfo) => {
            const name =
              chunkInfo.facadeModuleId?.split('/').pop()?.replace(/\.(t|j)sx?$/, '') ?? 'chunk';
            return `js/${name}-[hash].js`;
          },
          assetFileNames: (assetInfo) => {
            const ext = assetInfo.name?.split('.').pop() ?? 'asset';
            const bucket = /png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)
              ? 'images'
              : /woff2?|eot|ttf|otf/i.test(ext)
              ? 'fonts'
              : ext;
            return `${bucket}/[name]-[hash][extname]`;
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },

    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: JSON.stringify(mode === 'development'),
    },

    css: {
      devSourcemap: true,
      preprocessorOptions: {
        scss: { additionalData: `@import "@/styles/variables.scss";` },
      },
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'zustand',
        'axios',
        'clsx',
        'date-fns',
        'jwt-decode',
        'web-vitals',
      ],
      exclude: ['@vite/client', '@vite/env'],
    },

    worker: {
      format: 'es',
    },
  };
});
