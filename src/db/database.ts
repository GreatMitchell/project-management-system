import Dexie, { type EntityTable } from 'dexie'
import type { Milestone, NodeConnection, PraxisNode, Project, Review } from '../domain/types'
import type { PersistenceStatus } from '../persistence/types'

export interface PersistenceRecord { id: 'local-backup'; directoryHandle: FileSystemDirectoryHandle | null; status: PersistenceStatus }

const storesV3 = {
  projects: 'id, status, updatedAt', nodes: 'id, projectId, [projectId+position], status, updatedAt',
  nodeConnections: 'id, projectId, sourceNodeId, targetNodeId, &[projectId+sourceNodeId+targetNodeId]',
  milestones: 'id, projectId, &nodeId, result, updatedAt', reviews: 'id, projectId, trigger, createdAt', persistence: 'id',
}

export class PraxisDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>; nodes!: EntityTable<PraxisNode, 'id'>; nodeConnections!: EntityTable<NodeConnection, 'id'>
  milestones!: EntityTable<Milestone, 'id'>; reviews!: EntityTable<Review, 'id'>; persistence!: EntityTable<PersistenceRecord, 'id'>

  constructor() {
    super('praxis-path')
    this.version(1).stores({ projects: 'id, status, updatedAt', nodes: 'id, projectId, [projectId+position], status, updatedAt', milestones: 'id, projectId, &nodeId, result, updatedAt', reviews: 'id, projectId, trigger, createdAt' })
    this.version(2).stores({ projects: 'id, status, updatedAt', nodes: 'id, projectId, [projectId+position], status, updatedAt', milestones: 'id, projectId, &nodeId, result, updatedAt', reviews: 'id, projectId, trigger, createdAt', persistence: 'id' })
    this.version(3).stores(storesV3).upgrade(async (transaction) => {
      const nodes = await transaction.table<PraxisNode, string>('nodes').toArray(); const byProject = new Map<string, PraxisNode[]>()
      for (const node of nodes) { const items = byProject.get(node.projectId) ?? []; items.push(node); byProject.set(node.projectId, items) }
      const connections: NodeConnection[] = []
      for (const [projectId, items] of byProject) { items.sort((a, b) => a.position - b.position); for (let index = 0; index < items.length - 1; index += 1) connections.push({ id: crypto.randomUUID(), projectId, sourceNodeId: items[index].id, targetNodeId: items[index + 1].id, isPreferred: false, createdAt: items[index + 1].createdAt }) }
      if (connections.length) await transaction.table<NodeConnection, string>('nodeConnections').bulkAdd(connections)
    })
    this.version(4).stores({ ...storesV3, projects: 'id, status, activeNodeId, updatedAt', nodeConnections: 'id, projectId, sourceNodeId, targetNodeId, isPreferred, &[projectId+sourceNodeId+targetNodeId]' }).upgrade(async (transaction) => {
      const nodes = await transaction.table<PraxisNode, string>('nodes').toArray(); const projects = await transaction.table<Project, string>('projects').toArray(); const byProject = new Map<string, PraxisNode[]>()
      for (const node of nodes) { const items = byProject.get(node.projectId) ?? []; items.push(node); byProject.set(node.projectId, items) }
      for (const project of projects) { const latest = [...(byProject.get(project.id) ?? [])].sort((a, b) => b.position - a.position)[0]; await transaction.table<Project, string>('projects').update(project.id, { activeNodeId: latest?.id ?? null }) }
      await transaction.table<NodeConnection, string>('nodeConnections').toCollection().modify({ isPreferred: false })
    })
  }
}

export const db = new PraxisDatabase()
