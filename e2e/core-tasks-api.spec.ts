import { test, expect } from '@playwright/test'
import { createServer as createHttpServer } from 'node:http'
import { mkdtemp, copyFile, symlink, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { createServer, type ViteDevServer } from 'vite'

test('development app syncs core tasks, updates, removes closed projects and restores cache', async ({ browser }) => {
  test.setTimeout(90_000)
  const directory = await mkdtemp(join(tmpdir(), 'praxis-core-api-e2e-'))
  const root = process.cwd()
  const probe = createHttpServer()
  await new Promise<void>((done) => probe.listen(0, '127.0.0.1', done))
  const apiPort = (probe.address() as { port: number }).port
  await new Promise<void>((done) => probe.close(() => done()))
  const previousPort = process.env.CORE_TASKS_PORT
  process.env.CORE_TASKS_PORT = String(apiPort)
  let vite: ViteDevServer | undefined
  let appPort = 0
  const context = await browser.newContext()
  const api = `http://127.0.0.1:${apiPort}/api/core-tasks`
  const start = async () => {
    const server = await createServer({
      configFile: resolve(root, 'vite.config.ts'), root: directory,
      server: { host: '127.0.0.1', port: appPort, strictPort: true, fs: { allow: [root, directory] } },
    })
    await server.listen()
    appPort = (server.httpServer!.address() as { port: number }).port
    return server
  }
  try {
    await copyFile(resolve(root, 'index.html'), join(directory, 'index.html'))
    await symlink(resolve(root, 'src'), join(directory, 'src'), 'junction')
    await symlink(resolve(root, 'node_modules'), join(directory, 'node_modules'), 'junction')
    vite = await start()
    expect((await context.request.get(api)).status()).toBe(503)
    const page = await context.newPage()
    await page.goto(vite.resolvedUrls!.local[0])
    await expect.poll(async () => (await context.request.get(api)).status()).toBe(200)
    expect((await (await context.request.get(api)).json()).tasks).toEqual([])
    await page.evaluate(async () => {
      const { db } = await import('/src/db/database.ts')
      const date = '2026-01-02T03:04:05.000Z'
      await db.transaction('rw', db.projects, db.nodes, async () => {
        await db.projects.add({ id: 'api-project', title: 'HTTP 测试项目', trigger: '', status: 'advancing', type: 'general', activeNodeId: null, focusedNodeIds: [], coreNodeIds: ['api-node'], pinnedAt: null, createdAt: date, updatedAt: date })
        await db.nodes.add({ id: 'api-node', projectId: 'api-project', type: 'question', content: '# 核心 **问题**', status: 'exploring', log: '', position: 0, createdAt: date, updatedAt: date })
      })
    })
    await expect.poll(async () => (await (await context.request.get(api)).json()).tasks[0]?.content).toBe('# 核心 **问题**')
    const snapshot = await (await context.request.get(api)).json()
    const blockedCache = await context.request.get(new URL('/.core-tasks/snapshot.json', vite.resolvedUrls!.local[0]).href)
    expect(blockedCache.status()).toBe(403)
    expect(await blockedCache.text()).not.toContain('# 核心 **问题**')
    expect(snapshot.tasks[0]).toMatchObject({ projectName: 'HTTP 测试项目', nodeType: 'question', status: 'exploring' })
    await page.goto(snapshot.tasks[0].url)
    await expect(page.getByRole('heading', { name: 'HTTP 测试项目', exact: true })).toBeVisible()
    await page.evaluate(async () => {
      const { db } = await import('/src/db/database.ts')
      await db.nodes.update('api-node', { content: '更新内容', status: 'completed' })
    })
    await expect.poll(async () => (await (await context.request.get(api)).json()).tasks[0]?.content).toBe('更新内容')
    await page.close()
    expect((await (await context.request.get(api)).json()).tasks[0].content).toBe('更新内容')
    await vite.close()
    vite = await start()
    expect((await (await context.request.get(api)).json()).tasks[0].content).toBe('更新内容')
    const reopened = await context.newPage()
    // Restore the original browser origin so it uses the same IndexedDB.
    await reopened.goto(snapshot.tasks[0].url)
    await reopened.evaluate(async () => {
      const { db } = await import('/src/db/database.ts')
      await db.projects.update('api-project', { status: 'completed' })
    })
    await expect.poll(async () => (await (await context.request.get(api)).json()).tasks).toEqual([])
  } finally {
    await context.close()
    await vite?.close()
    if (previousPort === undefined) delete process.env.CORE_TASKS_PORT
    else process.env.CORE_TASKS_PORT = previousPort
    await rm(directory, { recursive: true, force: true })
  }
})
