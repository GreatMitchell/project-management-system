import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 允许所有IP访问
    port: 5173,
    allowedHosts: [
      '.ts.net',                 // 允许所有 Tailscale 域名（推荐）
      // 或者直接设为 true 来完全关闭这个安全检查（不推荐用于生产）
    ],
  }
})
