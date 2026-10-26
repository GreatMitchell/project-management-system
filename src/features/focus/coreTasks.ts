import { db } from '../../db/database'
import type { PraxisNode, Project } from '../../domain/types'
import type { CoreTask } from './coreTasksContract'

export interface FocusRow { project: Project; node: PraxisNode }

export function isOpenFocusRow(row: FocusRow) {
  return row.project.status !== 'completed' && row.project.status !== 'abandoned'
}

export async function loadFocusRows(): Promise<FocusRow[]> {
  return db.transaction('r', db.projects, db.nodes, async () => {
    const projects = await db.projects.toArray()
    const rows: FocusRow[] = []
    for (const project of projects) {
      if (!project.coreNodeIds?.length) continue
      const nodes = await db.nodes.bulkGet([...new Set(project.coreNodeIds)])
      for (const node of nodes) {
        if (node?.projectId === project.id) rows.push({ project, node })
      }
    }
    return rows.sort((a, b) => b.node.updatedAt.localeCompare(a.node.updatedAt))
  })
}

export function toCoreTasks(rows: FocusRow[], origin: string): CoreTask[] {
  return rows.filter(isOpenFocusRow).map(({ project, node }) => {
    const url = new URL(`/projects/${encodeURIComponent(project.id)}`, origin)
    url.searchParams.set('node', node.id)
    return {
      projectName: project.title,
      nodeType: node.type,
      content: node.content,
      status: node.status ?? node.vulnerabilityStatus ?? null,
      updatedAt: node.updatedAt,
      url: url.href,
    }
  })
}
