import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { coreTasksApiPlugin } from './server/coreTasksApi'

export default defineConfig({
  plugins: [react(), coreTasksApiPlugin()],
  server: {
    host: '0.0.0.0', // 允许所有IP访问
    port: 5173,
    fs: {
      // Vite 监听局域网，但核心任务缓存不能作为静态文件对外提供。
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.core-tasks/**'],
    },
    allowedHosts: [
      '.ts.net',                 // 允许所有 Tailscale 域名（推荐）
      // 或者直接设为 true 来完全关闭这个安全检查（不推荐用于生产）
    ],
  }
})
