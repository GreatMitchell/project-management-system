import { describe, expect, it } from 'vitest'
import { selectSnapshotsToKeep } from './retention'
import type { SnapshotMetadata } from './types'

const now = Date.parse('2026-07-30T12:00:00.000Z')
const snapshot = (id: string, createdAt: string): SnapshotMetadata => ({ id, fileName: `${id}.json`, createdAt, size: 1, projectCount: 1, nodeCount: 1 })

describe('快照保留策略', () => {
  it('最近 24 小时最多保留最新十份', () => {
    const items = Array.from({ length: 12 }, (_, index) => snapshot(`recent-${index}`, new Date(now - index * 60_000).toISOString()))
    const keep = selectSnapshotsToKeep(items, now)
    expect(keep.size).toBe(10)
    expect(keep.has('recent-0')).toBe(true)
    expect(keep.has('recent-11')).toBe(false)
  })

  it('30 天内每天保留最新一份', () => {
    const items = [
      snapshot('day-new', '2026-07-28T18:00:00.000Z'),
      snapshot('day-old', '2026-07-28T08:00:00.000Z'),
      snapshot('other-day', '2026-07-27T08:00:00.000Z'),
    ]
    const keep = selectSnapshotsToKeep(items, now)
    expect([...keep]).toEqual(['day-new', 'other-day'])
  })

  it('超过 30 天每月保留最新一份', () => {
    const items = [
      snapshot('june-new', '2026-06-28T18:00:00.000Z'),
      snapshot('june-old', '2026-06-03T08:00:00.000Z'),
      snapshot('may', '2026-05-20T08:00:00.000Z'),
    ]
    const keep = selectSnapshotsToKeep(items, now)
    expect([...keep]).toEqual(['june-new', 'may'])
  })
})
