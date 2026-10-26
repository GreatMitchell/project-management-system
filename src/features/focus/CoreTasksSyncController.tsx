import { liveQuery } from 'dexie'
import { useEffect } from 'react'
import { loadFocusRows, toCoreTasks } from './coreTasks'
import { createCoreTasksSync } from './coreTasksSync'

export function CoreTasksSyncController() {
  useEffect(() => {
    // 静态部署及分享页不上传数据；开发服务只接受本机页面的同步。
    if (!import.meta.env.DEV || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return
    const sync = createCoreTasksSync()
    const subscription = liveQuery(loadFocusRows).subscribe({
      next: (rows) => sync.update(toCoreTasks(rows, window.location.origin)),
      error: (error) => console.warn('无法读取核心任务，保留上一次 HTTP 快照。', error),
    })
    const refresh = () => { if (!document.hidden) sync.refresh() }
    document.addEventListener('visibilitychange', refresh)
    const heartbeat = window.setInterval(refresh, 30_000)
    return () => {
      subscription.unsubscribe()
      sync.stop()
      document.removeEventListener('visibilitychange', refresh)
      window.clearInterval(heartbeat)
    }
  }, [])
  return null
}
