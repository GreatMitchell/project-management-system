import { db } from '../db/database'
import type { BackupData } from '../domain/types'
import { selectSnapshotsToKeep } from './retention'
import { emptyPersistenceStatus, type PersistenceProvider, type PersistenceStatus, type SnapshotManifest, type SnapshotMetadata } from './types'

const RECORD_ID = 'local-backup' as const
const MANIFEST_FILE = 'manifest.json'
const SNAPSHOT_DIRECTORY = 'snapshots'
const permission = { mode: 'readwrite' as const }

async function writeJson(directory: FileSystemDirectoryHandle, fileName: string, value: unknown) {
  const fileHandle = await directory.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(value, null, 2))
  await writable.close()
}

async function readJson<T>(directory: FileSystemDirectoryHandle, fileName: string): Promise<T> {
  const fileHandle = await directory.getFileHandle(fileName)
  const file = await fileHandle.getFile()
  return JSON.parse(await file.text()) as T
}

function unsupportedStatus(): PersistenceStatus {
  return { ...emptyPersistenceStatus, connection: 'unsupported', lastError: '当前浏览器不支持自动文件备份，请使用桌面版 Chrome 或 Edge。' }
}

export class FileSystemPersistenceProvider implements PersistenceProvider {
  isSupported() { return 'showDirectoryPicker' in window }

  private async record() { return db.persistence.get(RECORD_ID) }

  private async updateStatus(status: PersistenceStatus, handle?: FileSystemDirectoryHandle | null) {
    const current = await this.record()
    await db.persistence.put({ id: RECORD_ID, directoryHandle: handle === undefined ? current?.directoryHandle ?? null : handle, status })
    return status
  }

  private async authorizedHandle(request = false) {
    const record = await this.record()
    const handle = record?.directoryHandle
    if (!handle) return null
    let state = await handle.queryPermission(permission)
    if (state !== 'granted' && request) state = await handle.requestPermission(permission)
    return state === 'granted' ? handle : null
  }

  async connect() {
    if (!this.isSupported()) return this.updateStatus(unsupportedStatus(), null)
    const handle = await window.showDirectoryPicker({ id: 'praxis-path-backups', mode: 'readwrite', startIn: 'documents' })
    const snapshotsDirectory = await handle.getDirectoryHandle(SNAPSHOT_DIRECTORY, { create: true })
    let manifest: SnapshotManifest
    try { manifest = await readJson<SnapshotManifest>(handle, MANIFEST_FILE) }
    catch { manifest = { formatVersion: 1, encryption: 'none', updatedAt: new Date().toISOString(), snapshots: [] }; await writeJson(handle, MANIFEST_FILE, manifest) }
    await snapshotsDirectory.getFileHandle('.keep', { create: true })
    return this.updateStatus({ connection: 'connected', directoryName: handle.name, lastSnapshotAt: manifest.snapshots[0]?.createdAt ?? null, lastError: null, snapshotCount: manifest.snapshots.length }, handle)
  }

  async reconnect() {
    if (!this.isSupported()) return this.updateStatus(unsupportedStatus(), null)
    const record = await this.record()
    const handle = await this.authorizedHandle(true)
    if (!handle) return this.updateStatus({ ...(record?.status ?? emptyPersistenceStatus), connection: record?.directoryHandle ? 'permission-required' : 'disconnected', lastError: record?.directoryHandle ? '需要重新授予备份目录访问权限。' : null })
    const snapshots = await this.listSnapshotsWithHandle(handle)
    return this.updateStatus({ connection: 'connected', directoryName: handle.name, lastSnapshotAt: snapshots[0]?.createdAt ?? null, lastError: null, snapshotCount: snapshots.length })
  }

  async disconnect() {
    await db.persistence.put({ id: RECORD_ID, directoryHandle: null, status: emptyPersistenceStatus })
  }

  async getStatus(): Promise<PersistenceStatus> {
    if (!this.isSupported()) return unsupportedStatus()
    const record = await this.record()
    if (!record?.directoryHandle) return record?.status ?? emptyPersistenceStatus
    const state = await record.directoryHandle.queryPermission(permission)
    if (state !== 'granted') return { ...record.status, connection: 'permission-required' }
    return { ...record.status, connection: 'connected' }
  }

  private async listSnapshotsWithHandle(handle: FileSystemDirectoryHandle) {
    try {
      const manifest = await readJson<SnapshotManifest>(handle, MANIFEST_FILE)
      return [...manifest.snapshots].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    } catch { return [] }
  }

  async listSnapshots() {
    const handle = await this.authorizedHandle()
    if (!handle) return []
    return this.listSnapshotsWithHandle(handle)
  }

  async saveSnapshot(data: BackupData) {
    const handle = await this.authorizedHandle()
    if (!handle) throw new Error('BACKUP_PERMISSION_REQUIRED')
    const snapshotsDirectory = await handle.getDirectoryHandle(SNAPSHOT_DIRECTORY, { create: true })
    const createdAt = new Date().toISOString()
    const id = crypto.randomUUID()
    const fileName = `snapshot-${createdAt.replace(/[:.]/g, '-')}-${id.slice(0, 8)}.json`
    const payload = { formatVersion: 1, encryption: 'none', snapshotId: id, ...data, exportedAt: createdAt }
    const serialized = JSON.stringify(payload, null, 2)
    const fileHandle = await snapshotsDirectory.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(serialized)
    await writable.close()
    const metadata: SnapshotMetadata = { id, fileName, createdAt, size: new Blob([serialized]).size, projectCount: data.projects.length, nodeCount: data.nodes.length }
    const existing = await this.listSnapshotsWithHandle(handle)
    const all = [metadata, ...existing]
    const keep = selectSnapshotsToKeep(all)
    const retained = all.filter((item) => keep.has(item.id))
    for (const snapshot of all) if (!keep.has(snapshot.id)) await snapshotsDirectory.removeEntry(snapshot.fileName).catch(() => undefined)
    const manifest: SnapshotManifest = { formatVersion: 1, encryption: 'none', updatedAt: createdAt, snapshots: retained }
    await writeJson(handle, MANIFEST_FILE, manifest)
    await this.updateStatus({ connection: 'connected', directoryName: handle.name, lastSnapshotAt: createdAt, lastError: null, snapshotCount: retained.length })
    return metadata
  }

  async restoreSnapshot(id: string) {
    const handle = await this.authorizedHandle()
    if (!handle) throw new Error('BACKUP_PERMISSION_REQUIRED')
    const metadata = (await this.listSnapshotsWithHandle(handle)).find((item) => item.id === id)
    if (!metadata) throw new Error('SNAPSHOT_NOT_FOUND')
    const directory = await handle.getDirectoryHandle(SNAPSHOT_DIRECTORY)
    return readJson<BackupData>(directory, metadata.fileName)
  }
}

export const fileSystemPersistence = new FileSystemPersistenceProvider()
