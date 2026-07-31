import { z } from 'zod'
import { db } from '../db/database'
import { buildLinearConnections, validateConnectionSet } from '../domain/graph'
import { milestoneInputSchema, nodeInputSchema, projectInputSchema, reviewInputSchema, type BackupData, type BackupDataV1, type MilestoneInput, type NodeConnection, type NodeInput, type PraxisNode, type Project, type ProjectBundle, type ProjectInput, type ProjectStatus, type ReviewInput } from '../domain/types'
import { canTransition, nextNodePosition } from '../domain/rules'

const now = () => new Date().toISOString()
const id = () => crypto.randomUUID()

export const repository = {
  async listProjects() { return db.projects.orderBy('updatedAt').reverse().toArray() },
  async getBundle(projectId: string): Promise<ProjectBundle | null> {
    const project = await db.projects.get(projectId); if (!project) return null
    const [nodes, connections, milestones, reviews] = await Promise.all([db.nodes.where('projectId').equals(projectId).sortBy('position'), db.nodeConnections.where('projectId').equals(projectId).toArray(), db.milestones.where('projectId').equals(projectId).toArray(), db.reviews.where('projectId').equals(projectId).reverse().sortBy('createdAt')])
    return { project, nodes, connections, milestones, reviews }
  },
  async createProject(input: ProjectInput) {
    const clean = projectInputSchema.parse(input); const timestamp = now(); const project: Project = { id: id(), ...clean, createdAt: timestamp, updatedAt: timestamp }
    await db.projects.add(project); return project
  },
  async updateProject(projectId: string, input: ProjectInput) {
    const current = await db.projects.get(projectId); if (!current) throw new Error('项目不存在')
    const clean = projectInputSchema.parse(input); if (!canTransition(current.status, clean.status)) throw new Error('不允许直接切换到该状态')
    await db.projects.update(projectId, { ...clean, updatedAt: now() })
  },
  async setProjectStatus(projectId: string, status: ProjectStatus, force = false) {
    const project = await db.projects.get(projectId); if (!project) throw new Error('项目不存在')
    if (!canTransition(project.status, status)) throw new Error('不允许直接切换到该状态')
    if (status === 'completed' && !force && !await db.milestones.where('projectId').equals(projectId).filter((item) => item.result === 'passed').count()) throw new Error('NO_PASSED_MILESTONE')
    await db.projects.update(projectId, { status, updatedAt: now() })
  },
  async deleteProject(projectId: string) {
    await db.transaction('rw', db.projects, db.nodes, db.nodeConnections, db.milestones, db.reviews, async () => {
      await Promise.all([db.nodes.where('projectId').equals(projectId).delete(), db.nodeConnections.where('projectId').equals(projectId).delete(), db.milestones.where('projectId').equals(projectId).delete(), db.reviews.where('projectId').equals(projectId).delete()]); await db.projects.delete(projectId)
    })
  },
  async saveNode(projectId: string, input: NodeInput, nodeId?: string, predecessorNodeId?: string) {
    const clean = nodeInputSchema.parse(input); const timestamp = now()
    if (nodeId) { await db.nodes.update(nodeId, { ...clean, updatedAt: timestamp }); await db.projects.update(projectId, { updatedAt: timestamp }); return db.nodes.get(nodeId) }
    const nodes = await db.nodes.where('projectId').equals(projectId).toArray()
    if (predecessorNodeId && !nodes.some((node) => node.id === predecessorNodeId)) throw new Error('前驱节点不存在')
    const node: PraxisNode = { id: id(), projectId, ...clean, position: nextNodePosition(nodes), createdAt: timestamp, updatedAt: timestamp }
    await db.transaction('rw', db.nodes, db.nodeConnections, db.projects, async () => { await db.nodes.add(node); if (predecessorNodeId) await db.nodeConnections.add({ id: id(), projectId, sourceNodeId: predecessorNodeId, targetNodeId: node.id, createdAt: timestamp }); await db.projects.update(projectId, { updatedAt: timestamp }) })
    return node
  },
  async createConnection(projectId: string, sourceNodeId: string, targetNodeId: string) {
    const [source, target, nodes, connections] = await Promise.all([db.nodes.get(sourceNodeId), db.nodes.get(targetNodeId), db.nodes.where('projectId').equals(projectId).toArray(), db.nodeConnections.where('projectId').equals(projectId).toArray()])
    if (!source || !target || source.projectId !== projectId || target.projectId !== projectId) throw new Error('只能连接同一项目中存在的节点')
    const connection: NodeConnection = { id: id(), projectId, sourceNodeId, targetNodeId, createdAt: now() }; validateConnectionSet(nodes, [...connections, connection])
    await db.transaction('rw', db.nodeConnections, db.projects, async () => { await db.nodeConnections.add(connection); await db.projects.update(projectId, { updatedAt: now() }) }); return connection
  },
  async deleteConnection(connectionId: string) {
    const connection = await db.nodeConnections.get(connectionId); if (!connection) return
    await db.transaction('rw', db.nodeConnections, db.projects, async () => { await db.nodeConnections.delete(connectionId); await db.projects.update(connection.projectId, { updatedAt: now() }) })
  },
  async deleteNode(nodeId: string) {
    const node = await db.nodes.get(nodeId); if (!node) return
    await db.transaction('rw', db.nodes, db.nodeConnections, db.milestones, db.projects, async () => {
      await db.milestones.where('nodeId').equals(nodeId).delete(); await db.nodeConnections.where('sourceNodeId').equals(nodeId).delete(); await db.nodeConnections.where('targetNodeId').equals(nodeId).delete(); await db.nodes.delete(nodeId)
      const remaining = await db.nodes.where('projectId').equals(node.projectId).sortBy('position'); await Promise.all(remaining.map((item, position) => db.nodes.update(item.id, { position }))); await db.projects.update(node.projectId, { updatedAt: now() })
    })
  },
  async moveNode(nodeId: string, direction: -1 | 1) {
    const node = await db.nodes.get(nodeId); if (!node) return
    const nodes = await db.nodes.where('projectId').equals(node.projectId).sortBy('position'); const index = nodes.findIndex((item) => item.id === nodeId); const target = nodes[index + direction]; if (!target) return
    await db.transaction('rw', db.nodes, async () => { const timestamp = now(); await db.nodes.update(node.id, { position: target.position, updatedAt: timestamp }); await db.nodes.update(target.id, { position: node.position, updatedAt: timestamp }) })
  },
  async saveMilestone(projectId: string, nodeId: string, input: MilestoneInput) {
    const clean = milestoneInputSchema.parse(input); const existing = await db.milestones.where('nodeId').equals(nodeId).first(); const timestamp = now(); const values = { ...clean, validatedAt: clean.result ? timestamp : null, updatedAt: timestamp }
    if (existing) await db.milestones.update(existing.id, values); else await db.milestones.add({ id: id(), projectId, nodeId, ...values, createdAt: timestamp }); await db.projects.update(projectId, { updatedAt: timestamp })
  },
  async deleteMilestone(nodeId: string) { await db.milestones.where('nodeId').equals(nodeId).delete() },
  async saveReview(projectId: string, input: ReviewInput, reviewId?: string) { const clean = reviewInputSchema.parse(input); const timestamp = now(); if (reviewId) await db.reviews.update(reviewId, { ...clean, updatedAt: timestamp }); else await db.reviews.add({ id: id(), projectId, ...clean, createdAt: timestamp, updatedAt: timestamp }) },
  async deleteReview(reviewId: string) { await db.reviews.delete(reviewId) },
  async exportData(): Promise<BackupData> {
    const [projects, nodes, connections, milestones, reviews] = await Promise.all([db.projects.toArray(), db.nodes.toArray(), db.nodeConnections.toArray(), db.milestones.toArray(), db.reviews.toArray()]); return { version: 2, exportedAt: now(), projects, nodes, connections, milestones, reviews }
  },
  async importData(raw: unknown, mode: 'merge' | 'replace') {
    const base = z.object({ id: z.string(), createdAt: z.string(), updatedAt: z.string() }).passthrough(); const project = base.extend({ trigger: z.string(), title: z.string(), status: z.string() }); const node = base.extend({ projectId: z.string(), type: z.string(), content: z.string(), status: z.string(), log: z.string(), position: z.number().int().nonnegative() }); const connection = z.object({ id: z.string(), projectId: z.string(), sourceNodeId: z.string(), targetNodeId: z.string(), createdAt: z.string() }); const milestone = base.extend({ projectId: z.string(), nodeId: z.string(), title: z.string(), method: z.string(), criteria: z.string(), result: z.string().nullable(), feeling: z.string(), validatedAt: z.string().nullable() }); const review = base.extend({ projectId: z.string(), trigger: z.string(), health: z.string(), execution: z.string(), systemAdjustment: z.string() })
    const common = { exportedAt: z.string(), projects: z.array(project), nodes: z.array(node), milestones: z.array(milestone), reviews: z.array(review) }; const schema = z.discriminatedUnion('version', [z.object({ version: z.literal(1), ...common }), z.object({ version: z.literal(2), ...common, connections: z.array(connection) })]); const data = schema.parse(raw) as BackupData | BackupDataV1
    data.projects.forEach((item) => projectInputSchema.parse(item)); data.nodes.forEach((item) => nodeInputSchema.parse(item)); data.milestones.forEach((item) => milestoneInputSchema.parse(item)); data.reviews.forEach((item) => reviewInputSchema.parse(item)); const connections = data.version === 1 ? buildLinearConnections(data.nodes, id) : data.connections; validateConnectionSet(data.nodes, connections)
    await db.transaction('rw', db.projects, db.nodes, db.nodeConnections, db.milestones, db.reviews, async () => {
      if (mode === 'replace') await Promise.all([db.projects.clear(), db.nodes.clear(), db.nodeConnections.clear(), db.milestones.clear(), db.reviews.clear()]); await db.projects.bulkPut(data.projects); await db.nodes.bulkPut(data.nodes)
      if (mode === 'merge') { const keys = new Set((await db.nodeConnections.toArray()).map((item) => `${item.projectId}:${item.sourceNodeId}:${item.targetNodeId}`)); await db.nodeConnections.bulkPut(connections.filter((item) => !keys.has(`${item.projectId}:${item.sourceNodeId}:${item.targetNodeId}`))) } else await db.nodeConnections.bulkPut(connections)
      await db.milestones.bulkPut(data.milestones); await db.reviews.bulkPut(data.reviews)
    })
  },
}
