export const coreTasksSyncPath = '/__core-tasks/sync'
export const coreTasksApiPath = '/api/core-tasks'

export interface CoreTask {
  projectName: string
  nodeType: string
  content: string
  status: string | null
  updatedAt: string
  url: string
}

export interface CoreTasksSnapshot {
  syncedAt: string
  tasks: CoreTask[]
}

export function isCoreTasksSnapshot(value: unknown): value is CoreTasksSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Record<string, unknown>
  return typeof snapshot.syncedAt === 'string' && Number.isFinite(Date.parse(snapshot.syncedAt)) && isCoreTaskList(snapshot.tasks)
}

export function isCoreTaskList(value: unknown): value is CoreTask[] {
  if (!Array.isArray(value)) return false
  const fields = ['projectName', 'nodeType', 'content', 'status', 'updatedAt', 'url']
  return value.every((task: unknown) => {
    if (!task || typeof task !== 'object') return false
    const record = task as Record<string, unknown>
    if (Object.keys(record).length !== fields.length || !fields.every((field) => field === 'status' && record[field] === null || typeof record[field] === 'string')) return false
    if (!Number.isFinite(Date.parse(record.updatedAt as string))) return false
    try {
      const url = new URL(record.url as string)
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
    } catch {
      return false
    }
  })
}
