import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/database'
import type { PraxisNode, Project } from '../../domain/types'
import { isCoreTaskList } from './coreTasksContract'
import { loadFocusRows, toCoreTasks } from './coreTasks'

const date = '2026-01-02T03:04:05.000Z'
function project(id: string, overrides: Partial<Project> = {}): Project {
  return { id, title: `项目${id}`, trigger: '', status: 'advancing', type: 'general', activeNodeId: null, focusedNodeIds: [], coreNodeIds: [], pinnedAt: null, createdAt: date, updatedAt: date, ...overrides }
}
function node(id: string, projectId: string, overrides: Partial<PraxisNode> = {}): PraxisNode {
  return { id, projectId, type: 'question', content: '# 原始内容\n**不截断**', status: 'exploring', log: '不应导出日志', position: 0, createdAt: date, updatedAt: date, ...overrides }
}
beforeEach(async () => { await db.delete(); await db.open() })

describe('core task projection', () => {
  it('loads only core nodes, skips missing/foreign nodes, deduplicates and sorts by update time', async () => {
    await db.projects.bulkAdd([
      project('p1', { coreNodeIds: ['old', 'new', 'new', 'missing', 'foreign'] }),
      project('p2', { focusedNodeIds: ['focused'] }),
    ])
    await db.nodes.bulkAdd([
      node('old', 'p1'), node('new', 'p1', { updatedAt: '2026-02-01T00:00:00.000Z' }),
      node('foreign', 'p2'), node('focused', 'p2'), node('ordinary', 'p1'),
    ])
    expect((await loadFocusRows()).map((row) => row.node.id)).toEqual(['new', 'old'])
  })
  it('excludes completed and abandoned projects but includes paused ones', () => {
    const rows = (['exploring', 'advancing', 'paused', 'completed', 'abandoned'] as const).map((status) => ({ project: project(status, { status }), node: node(status, status) }))
    expect(toCoreTasks(rows, 'http://localhost:5173').map((task) => task.projectName)).toEqual(['项目exploring', '项目advancing', '项目paused'])
  })
  it('exports exactly six fields, preserves raw Markdown and encodes node links', () => {
    const row = { project: project('p /?'), node: node('n& #中文', 'p /?') }
    const tasks = toCoreTasks([row], 'http://localhost:5173')
    expect(tasks).toEqual([{
      projectName: row.project.title, nodeType: 'question', content: row.node.content,
      status: 'exploring', updatedAt: date,
      url: 'http://localhost:5173/projects/p%20%2F%3F?node=n%26+%23%E4%B8%AD%E6%96%87',
    }])
    expect(isCoreTaskList(tasks)).toBe(true)
    expect(new URL(tasks[0].url).searchParams.get('node')).toBe(row.node.id)
  })
  it('handles scientific node statuses and stateless assumptions', () => {
    const p = project('research', { type: 'research' })
    const tasks = toCoreTasks([
      { project: p, node: node('v', p.id, { type: 'vulnerability', status: null, vulnerabilityStatus: 'patched' }) },
      { project: p, node: node('a', p.id, { type: 'assumption', status: null }) },
    ], 'http://127.0.0.1:5173')
    expect(tasks.map((task) => task.status)).toEqual(['patched', null])
    expect(isCoreTaskList(tasks)).toBe(true)
  })
  it('exports an empty array when there are no core tasks', async () => {
    expect(toCoreTasks(await loadFocusRows(), 'http://localhost:5173')).toEqual([])
  })
})
