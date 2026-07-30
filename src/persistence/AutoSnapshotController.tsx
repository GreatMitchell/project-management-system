import { liveQuery } from 'dexie'
import { useEffect } from 'react'
import { repository } from '../repositories/repository'
import { fileSystemPersistence } from './fileSystemProvider'

const SNAPSHOT_DELAY = 10_000

export function AutoSnapshotController() {
  useEffect(() => {
    let timer: number | undefined
    let saving = false
    let pending = false
    let initialized = false

    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(async () => {
        if (saving) { pending = true; return }
        const status = await fileSystemPersistence.getStatus()
        if (status.connection !== 'connected') return
        saving = true
        try { await fileSystemPersistence.saveSnapshot(await repository.exportData()) }
        catch (error) { console.error('Automatic snapshot failed', error) }
        finally {
          saving = false
          if (pending) { pending = false; schedule() }
        }
      }, SNAPSHOT_DELAY)
    }

    const subscription = liveQuery(() => repository.exportData()).subscribe({
      next: () => {
        if (initialized) schedule()
        else initialized = true
      },
      error: (error) => console.error('Snapshot change observer failed', error),
    })
    return () => { window.clearTimeout(timer); subscription.unsubscribe() }
  }, [])
  return null
}
