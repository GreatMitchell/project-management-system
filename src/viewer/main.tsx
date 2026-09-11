import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { SharedProjectViewerPage } from './SharedProjectViewerPage'
import '@xyflow/react/dist/style.css'
import 'katex/dist/katex.min.css'
import '../index.css'

// 只读分享查看入口：不依赖 react-router 与 IndexedDB，数据全部来自内嵌的分享信封。
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <SharedProjectViewerPage />
    </ErrorBoundary>
  </StrictMode>,
)
