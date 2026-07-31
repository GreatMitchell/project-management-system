import Dexie, { type EntityTable } from 'dexie'
import type { Milestone, NodeConnection, PraxisNode, Project, Review } from '../domain/types'
import type { PersistenceStatus } from '../persistence/types'

export interface PersistenceRecord {
  id: 'local-backup'
  directoryHandle: FileSystemDirectoryHandle | null
  status: PersistenceStatus
}

export class PraxisDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>
  nodes!: EntityTable<PraxisNode, 'id'>
  nodeConnections!: EntityTable<NodeConnection, 'id'>
  milestones!: EntityTable<Milestone, 'id'>
  reviews!: EntityTable<Review, 'id'>
  persistence!: EntityTable<PersistenceRecord, 'id'>

  constructor() {
    super('praxis-path')
    this.version(1).stores({
      projects: 'id, status, updatedAt',
      nodes: 'id, projectId, [projectId+position], status, updatedAt',
      milestones: 'id, projectId, &nodeId, result, updatedAt',
      reviews: 'id, projectId, trigger, createdAt',
    })
    this.version(2).stores({
      projects: 'id, status, updatedAt',
      nodes: 'id, projectId, [projectId+position], status, updatedAt',
      milestones: 'id, projectId, &nodeId, result, updatedAt',
      reviews: 'id, projectId, trigger, createdAt',
      persistence: 'id',
    })
    this.version(3).stores({
      projects: 'id, status, updatedAt',
      nodes: 'id, projectId, [projectId+position], status, updatedAt',
      nodeConnections: 'id, projectId, sourceNodeId, targetNodeId, &[projectId+sourceNodeId+targetNodeId]',
      milestones: 'id, projectId, &nodeId, result, updatedAt',
      reviews: 'id, projectId, trigger, createdAt',
      persistence: 'id',
    }).upgrade(async (transaction) => {
      const nodes = await transaction.table<PraxisNode, string>('nodes').toArray()
      const byProject = new Map<string, PraxisNode[]>()
      for (const node of nodes) {
        const projectNodes = byProject.get(node.projectId) ?? []
        projectNodes.push(node)
        byProject.set(node.projectId, projectNodes)
      }
      const connections: NodeConnection[] = []
      for (const [projectId, projectNodes] of byProject) {
        projectNodes.sort((a, b) => a.position - b.position)
        for (let index = 0; index < projectNodes.length - 1; index += 1) {
          connections.push({
            id: crypto.randomUUID(),
            projectId,
            sourceNodeId: projectNodes[index].id,
            targetNodeId: projectNodes[index + 1].id,
            createdAt: projectNodes[index + 1].createdAt,
          })
        }
      }
      if (connections.length) await transaction.table<NodeConnection, string>('nodeConnections').bulkAdd(connections)
    })
  }
}

export const db = new PraxisDatabase()
