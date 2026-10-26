import { defineConfig } from 'vite';

// `npm run dev` here serves the UI with hot reload and forwards API calls to `wrangler dev`.
export default defineConfig({
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8787', ws: true },
    },
  },
});
