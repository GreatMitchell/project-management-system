import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCoreTasksSync } from './coreTasksSync'
import type { CoreTask } from './coreTasksContract'

const task: CoreTask = { projectName: '项目', nodeType: 'question', content: '旧内容', status: 'advancing', updatedAt: '2026-01-01T00:00:00Z', url: 'http://localhost:5173/projects/p?node=n' }
beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('core tasks sync queue', () => {
  it('does not publish empty data before the first query resolves', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))
    const sync = createCoreTasksSync(fetcher)
    sync.refresh()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetcher).not.toHaveBeenCalled()
    sync.update([])
    await vi.advanceTimersByTimeAsync(200)
    expect(fetcher).toHaveBeenCalledWith('/__core-tasks/sync', expect.objectContaining({ body: '[]' }))
    sync.stop()
  })
  it('coalesces changes and sends only one request at a time', async () => {
    let resolve!: (response: Response) => void
    const fetcher = vi.fn<typeof fetch>()
      .mockImplementationOnce(() => new Promise((done) => { resolve = done }))
      .mockResolvedValue(new Response('{}'))
    const sync = createCoreTasksSync(fetcher)
    sync.update([task])
    await vi.advanceTimersByTimeAsync(200)
    sync.update([{ ...task, content: '中间内容' }])
    sync.update([{ ...task, content: '最新内容' }])
    await vi.advanceTimersByTimeAsync(200)
    expect(fetcher).toHaveBeenCalledTimes(1)
    resolve(new Response('{}'))
    await vi.advanceTimersByTimeAsync(200)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetcher.mock.calls[1][1]!.body as string)[0].content).toBe('最新内容')
    sync.stop()
  })
  it('retries failures with the latest tasks and refreshes unchanged snapshots', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('{}', { status: 500 })).mockResolvedValue(new Response('{}'))
    const sync = createCoreTasksSync(fetcher)
    sync.update([task])
    await vi.advanceTimersByTimeAsync(200)
    expect(fetcher).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(fetcher).toHaveBeenCalledTimes(2)
    sync.refresh()
    await vi.advanceTimersByTimeAsync(1)
    expect(fetcher).toHaveBeenCalledTimes(3)
    sync.stop()
  })
  it('aborts in-flight requests and does not retry after unmount', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    let signal: AbortSignal | undefined
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => {
      signal = init?.signal as AbortSignal
      return new Promise((_resolve, reject) => signal!.addEventListener('abort', () => reject(new Error('Aborted'))))
    })
    const sync = createCoreTasksSync(fetcher)
    sync.update([task])
    await vi.advanceTimersByTimeAsync(200)
    sync.stop()
    expect(signal?.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(console.warn).not.toHaveBeenCalled()
  })
  it('times out and retries a hung request', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('timeout')))
    }))
    const sync = createCoreTasksSync(fetcher)
    sync.update([task])
    await vi.advanceTimersByTimeAsync(15_200)
    expect(fetcher).toHaveBeenCalledTimes(2)
    sync.stop()
  })
})
