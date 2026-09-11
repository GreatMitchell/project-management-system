import { copyFileSync, mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const source = resolve(process.cwd(), 'dist-share/viewer.html')
const target = resolve(process.cwd(), 'public/share/viewer-template.html')

try {
  statSync(source)
} catch {
  console.error(`未找到 ${source}，请先运行 npm run build:viewer。`)
  process.exit(1)
}

mkdirSync(dirname(target), { recursive: true })
copyFileSync(source, target)
const size = statSync(target).size
console.log(`分享模板已生成：public/share/viewer-template.html（${(size / 1024 / 1024).toFixed(2)} MB）`)
