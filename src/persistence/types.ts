import type { BackupData } from '../domain/types'

export interface SnapshotMetadata {
  id: string
  fileName: string
  createdAt: string
  size: number
  projectCount: number
  nodeCount: number
}

export interface SnapshotManifest {
  formatVersion: 1
  encryption: 'none'
  updatedAt: string
  snapshots: SnapshotMetadata[]
}

export type PersistenceConnection = 'unsupported' | 'disconnected' | 'permission-required' | 'connected' | 'error'

export interface PersistenceStatus {
  connection: PersistenceConnection
  directoryName: string | null
  lastSnapshotAt: string | null
  lastError: string | null
  snapshotCount: number
}

export interface PersistenceProvider {
  isSupported(): boolean
  connect(): Promise<PersistenceStatus>
  reconnect(): Promise<PersistenceStatus>
  disconnect(): Promise<void>
  getStatus(): Promise<PersistenceStatus>
  saveSnapshot(data: BackupData): Promise<SnapshotMetadata>
  listSnapshots(): Promise<SnapshotMetadata[]>
  restoreSnapshot(id: string): Promise<BackupData>
}

export const emptyPersistenceStatus: PersistenceStatus = {
  connection: 'disconnected',
  directoryName: null,
  lastSnapshotAt: null,
  lastError: null,
  snapshotCount: 0,
}
