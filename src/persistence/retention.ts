import type { SnapshotMetadata } from './types'

const DAY = 24 * 60 * 60 * 1000

export function selectSnapshotsToKeep(snapshots: SnapshotMetadata[], currentTime = Date.now()) {
  const sorted = [...snapshots].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  const recent = sorted.filter((item) => currentTime - Date.parse(item.createdAt) <= DAY).slice(0, 10)
  const daily = new Map<string, SnapshotMetadata>()
  const monthly = new Map<string, SnapshotMetadata>()

  for (const snapshot of sorted) {
    const age = currentTime - Date.parse(snapshot.createdAt)
    if (age <= DAY) continue
    if (age <= 30 * DAY) {
      const day = snapshot.createdAt.slice(0, 10)
      if (!daily.has(day)) daily.set(day, snapshot)
    } else {
      const month = snapshot.createdAt.slice(0, 7)
      if (!monthly.has(month)) monthly.set(month, snapshot)
    }
  }

  return new Set([...recent, ...daily.values(), ...monthly.values()].map((item) => item.id))
}
