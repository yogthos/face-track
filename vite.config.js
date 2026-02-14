import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      formats: ['es'],
      fileName: 'face-track',
    },
    rollupOptions: {
      external: ['@tensorflow/tfjs'],
    },
    sourcemap: true,
  },
})
