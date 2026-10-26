// @vitest-environment node
import { createServer, request, type Server } from 'node:http'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCoreTasksService } from './coreTasksApi'

const task = {
  projectName: '项目甲', nodeType: '问题', content: '# 核心问题\n保留 **Markdown**',
  status: '待解决', updatedAt: '2026-01-02T03:04:05.000Z',
  url: 'http://localhost:5173/projects/p1?node=n1',
}
let directory: string
let server: Server
let base: string
let service: ReturnType<typeof createCoreTasksService>

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'core-tasks-'))
  service = createCoreTasksService(join(directory, 'snapshot.json'))
  await service.load()
  server = createServer((req, res) => {
    if (req.url === '/sync') void service.handleSync(req, res)
    else service.handleRead(req, res)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})
afterEach(async () => {
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await rm(directory, { recursive: true, force: true })
})
function post(body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${base}/sync`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...headers },
    body: JSON.stringify(body),
  })
}

describe('local core tasks HTTP API', () => {
  it('distinguishes never synced from an empty core task list', async () => {
    expect((await fetch(`${base}/api/core-tasks`)).status).toBe(503)
    expect((await post([])).status).toBe(200)
    const response = await fetch(`${base}/api/core-tasks`)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ syncedAt: expect.any(String), tasks: [] })
  })
  it('returns six task fields and restores the snapshot after restart', async () => {
    expect((await post([task])).status).toBe(200)
    const response = await fetch(`${base}/api/core-tasks`)
    const snapshot = await response.json()
    expect(snapshot.tasks).toEqual([task])
    expect(Object.keys(snapshot.tasks[0])).toHaveLength(6)
    const restored = createCoreTasksService(join(directory, 'snapshot.json'))
    await restored.load()
    expect(JSON.parse(await readFile(join(directory, 'snapshot.json'), 'utf8'))).toEqual(snapshot)
    service = restored
    expect(await (await fetch(`${base}/api/core-tasks`)).json()).toEqual(snapshot)
  })
  it('rejects writes on the public endpoint and unknown routes', async () => {
    expect((await fetch(`${base}/api/core-tasks`, { method: 'DELETE' })).status).toBe(405)
    expect((await fetch(`${base}/api/core-tasks`, { method: 'POST' })).status).toBe(405)
    expect((await fetch(`${base}/other`)).status).toBe(404)
  })
  it('blocks cross-origin sync/read and DNS rebinding hostnames', async () => {
    expect((await post([], { Origin: 'https://attacker.example' })).status).toBe(403)
    expect((await post([], { Host: 'attacker.example', Origin: 'http://attacker.example' })).status).toBe(403)
    expect((await fetch(`${base}/sync`, { method: 'POST' })).status).toBe(403)
    expect((await fetch(`${base}/api/core-tasks`, { headers: { Origin: 'https://attacker.example' } })).status).toBe(403)
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(`${base}/api/core-tasks`, { headers: { Host: 'attacker.example' } }, (res) => {
        res.resume()
        resolve(res.statusCode)
      })
      req.on('error', reject)
      req.end()
    })
    expect(status).toBe(403)
  })
  it('validates bodies without replacing the previous snapshot', async () => {
    await post([task])
    expect((await post([ { ...task, url: 'javascript:alert(1)' } ])).status).toBe(400)
    expect((await post([ { ...task, extra: true } ])).status).toBe(400)
    expect((await post([ { ...task, updatedAt: 'invalid' } ])).status).toBe(400)
    expect((await post([], { 'Content-Type': 'text/plain' })).status).toBe(415)
    expect((await fetch(`${base}/sync`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: '{' })).status).toBe(400)
    expect((await (await fetch(`${base}/api/core-tasks`)).json()).tasks).toEqual([task])
  })
  it('rejects oversized bodies', async () => {
    expect((await post([ { ...task, content: 'x'.repeat(2 * 1024 * 1024) } ])).status).toBe(413)
  })
  it('does not interpret corrupt cache as an empty list', async () => {
    const path = join(directory, 'snapshot.json')
    await writeFile(path, '{broken')
    const restored = createCoreTasksService(path)
    await expect(restored.load()).rejects.toThrow()
    service = restored
    expect((await fetch(`${base}/api/core-tasks`)).status).toBe(503)
    expect((await post([])).status).toBe(200)
  })
  it('keeps the last successful snapshot if writing fails and can retry', async () => {
    await post([task])
    await rm(directory, { recursive: true })
    await writeFile(directory, 'not a directory')
    expect((await post([])).status).toBe(500)
    expect((await (await fetch(`${base}/api/core-tasks`)).json()).tasks).toEqual([task])
    await rm(directory)
    expect((await post([])).status).toBe(200)
  })
})
