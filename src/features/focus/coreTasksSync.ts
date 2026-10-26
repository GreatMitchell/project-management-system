import { coreTasksSyncPath, type CoreTask } from './coreTasksContract'

export function createCoreTasksSync(fetcher: typeof fetch = fetch) {
  let latest: CoreTask[] | undefined
  let pending = false
  let running = false
  let stopped = false
  let warned = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let abort: AbortController | undefined

  function schedule(delay: number) {
    clearTimeout(timer)
    timer = setTimeout(() => { void send() }, delay)
  }

  async function send() {
    if (stopped || running || latest === undefined) return
    running = true
    pending = false
    abort = new AbortController()
    const timeout = setTimeout(() => abort?.abort(), 10_000)
    let failed = false
    try {
      const response = await fetcher(coreTasksSyncPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latest),
        signal: abort.signal,
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      warned = false
    } catch (error) {
      failed = true
      if (!stopped && !warned) {
        console.warn('核心任务 HTTP 快照同步失败，将自动重试。', error)
        warned = true
      }
    } finally {
      clearTimeout(timeout)
      running = false
      if (!stopped && (pending || failed)) schedule(pending ? 200 : 5_000)
    }
  }

  return {
    update(tasks: CoreTask[]) {
      if (stopped) return
      latest = tasks
      pending = true
      if (!running) schedule(200)
    },
    refresh() {
      if (!stopped && latest !== undefined) {
        pending = true
        if (!running) schedule(0)
      }
    },
    stop() {
      stopped = true
      clearTimeout(timer)
      abort?.abort()
    },
  }
}
