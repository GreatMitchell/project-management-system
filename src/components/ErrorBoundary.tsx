import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info) }
  render() {
    if (this.state.failed) return <main className="grid min-h-screen place-items-center bg-paper p-6"><div className="max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-soft"><p className="text-sm font-semibold uppercase tracking-widest text-clay">出现错误</p><h1 className="mt-3 font-serif text-3xl text-ink">这条路线暂时中断了</h1><p className="mt-3 text-moss">数据仍保存在本地。请刷新页面重新连接。</p><button className="button-primary mt-6" onClick={() => window.location.reload()}>刷新页面</button></div></main>
    return this.props.children
  }
}
