import { defineConfig } from 'vite';

export default defineConfig({
  // The build can also be hosted below a path such as /puzzles/.
  base: './',
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { target: 'es2022', sourcemap: true },
});
