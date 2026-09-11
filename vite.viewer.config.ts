import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 只读分享 viewer 的独立构建：产出自包含单文件 HTML（JS/CSS/KaTeX 字体全部内联），
// 供主应用在分享时取回并注入项目数据。singlefile 只支持单 HTML 入口，故与主构建分开。
export default defineConfig({
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: 'dist-share',
    emptyOutDir: true,
    rollupOptions: { input: { viewer: 'viewer.html' } },
  },
})
