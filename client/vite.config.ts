import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 13000,
    proxy: {
      // SSE 路径必须在通用 /api 之前，确保 SSE 流不被缓冲
      '/api/tasks/sse': {
        target: 'http://localhost:14000',
        changeOrigin: true,
        // 禁用代理缓冲，确保 SSE 流实时推送
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, req) => {
            if (req.url?.includes('/sse')) {
              // 移除可能导致缓冲的头
              proxyRes.headers['cache-control'] = 'no-cache'
              proxyRes.headers['x-accel-buffering'] = 'no'
              delete proxyRes.headers['content-encoding']
              delete proxyRes.headers['content-length']
              delete proxyRes.headers['transfer-encoding']
            }
          })
        },
      },
      '/api': {
        target: 'http://localhost:14000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
