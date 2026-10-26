import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Plugin } from 'vite'
import { coreTasksApiPath, coreTasksSyncPath, isCoreTaskList, isCoreTasksSnapshot, type CoreTasksSnapshot } from '../src/features/focus/coreTasksContract'

const maxBodyBytes = 2 * 1024 * 1024

function respond(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(body))
}

function isLoopback(address: string | undefined) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function isLocalHost(host: string | undefined) {
  if (!host) return false
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${host}`).hostname)
  } catch {
    return false
  }
}

export function createCoreTasksService(cacheFile: string) {
  let snapshot: CoreTasksSnapshot | undefined
  let writeQueue: Promise<void> = Promise.resolve()

  async function load() {
    try {
      const value: unknown = JSON.parse(await readFile(cacheFile, 'utf8'))
      if (!isCoreTasksSnapshot(value)) throw new Error('Invalid core tasks snapshot')
      snapshot = value
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }

  function sync(tasks: unknown) {
    if (!isCoreTaskList(tasks)) return Promise.reject(new Error('Invalid core tasks'))
    const next: CoreTasksSnapshot = { syncedAt: new Date().toISOString(), tasks }
    const operation = writeQueue.then(async () => {
      await mkdir(dirname(cacheFile), { recursive: true })
      const temporaryFile = `${cacheFile}.${randomUUID()}.tmp`
      try {
        await writeFile(temporaryFile, JSON.stringify(next), { encoding: 'utf8', mode: 0o600 })
        await rename(temporaryFile, cacheFile)
        snapshot = next
      } finally {
        await rm(temporaryFile, { force: true })
      }
    })
    writeQueue = operation.catch(() => {})
    return operation
  }

  function handleRead(request: IncomingMessage, response: ServerResponse) {
    if (!isLoopback(request.socket.remoteAddress) || !isLocalHost(request.headers.host) || request.headers.origin || request.headers['sec-fetch-site'] === 'cross-site') {
      respond(response, 403, { error: 'local_access_only' })
    } else if (request.url?.split('?')[0] !== coreTasksApiPath) {
      respond(response, 404, { error: 'not_found' })
    } else if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET')
      respond(response, 405, { error: 'method_not_allowed' })
    } else if (!snapshot) {
      respond(response, 503, { error: 'not_synced', message: 'Open the app locally to sync core tasks first.' })
    } else {
      respond(response, 200, snapshot)
    }
  }

  async function handleSync(request: IncomingMessage, response: ServerResponse) {
    let sameOrigin = false
    try {
      const origin = new URL(request.headers.origin ?? '')
      sameOrigin = ['http:', 'https:'].includes(origin.protocol) && origin.host === request.headers.host
    } catch { /* Missing or invalid Origin is not a browser sync request. */ }
    if (!isLoopback(request.socket.remoteAddress) || !isLocalHost(request.headers.host) || !sameOrigin) {
      respond(response, 403, { error: 'local_same_origin_only' })
      return
    }
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST')
      respond(response, 405, { error: 'method_not_allowed' })
      return
    }
    if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      respond(response, 415, { error: 'json_required' })
      return
    }
    let size = 0
    const chunks: Buffer[] = []
    try {
      for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        size += buffer.length
        if (size > maxBodyBytes) {
          respond(response, 413, { error: 'payload_too_large' })
          return
        }
        chunks.push(buffer)
      }
      let tasks: unknown
      try {
        tasks = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } catch {
        respond(response, 400, { error: 'invalid_json' })
        return
      }
      if (!isCoreTaskList(tasks)) {
        respond(response, 400, { error: 'invalid_tasks' })
        return
      }
      await sync(tasks)
      respond(response, 200, { syncedAt: snapshot!.syncedAt })
    } catch {
      if (!response.headersSent) respond(response, 500, { error: 'sync_failed' })
    }
  }

  return { load, sync, handleRead, handleSync }
}

export function coreTasksApiPlugin(): Plugin {
  return {
    name: 'core-tasks-api',
    apply: 'serve',
    async configureServer(vite) {
      const port = Number(process.env.CORE_TASKS_PORT ?? 5174)
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('CORE_TASKS_PORT must be an integer between 1 and 65535')
      const service = createCoreTasksService(resolve(vite.config.root, '.core-tasks/snapshot.json'))
      try {
        await service.load()
      } catch (error) {
        vite.config.logger.warn(`Core tasks cache could not be loaded; waiting for browser sync: ${String(error)}`)
      }
      const server = createServer(service.handleRead)
      server.requestTimeout = 15_000
      server.headersTimeout = 10_000
      await new Promise<void>((accept, reject) => {
        server.once('error', reject)
        server.listen(port, '127.0.0.1', () => {
          server.removeListener('error', reject)
          accept()
        })
      })
      server.on('error', (error) => vite.config.logger.error(`Core tasks API: ${error.message}`))
      vite.httpServer?.once('close', () => {
        server.close()
        server.closeAllConnections()
      })
      vite.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== coreTasksSyncPath) return next()
        void service.handleSync(request, response)
      })
      vite.config.logger.info(`Core tasks API: http://127.0.0.1:${port}${coreTasksApiPath}`)
    },
  }
}
