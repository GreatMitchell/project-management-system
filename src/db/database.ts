import Dexie, { type EntityTable } from 'dexie'
import type { Milestone, PraxisNode, Project, Review } from '../domain/types'
import type { PersistenceStatus } from '../persistence/types'

export interface PersistenceRecord {
  id: 'local-backup'
  directoryHandle: FileSystemDirectoryHandle | null
  status: PersistenceStatus
}

export class PraxisDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>
  nodes!: EntityTable<PraxisNode, 'id'>
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
  }
}

export const db = new PraxisDatabase()
