import { z } from 'zod'
import { db } from '../db/database'
import {
  milestoneInputSchema,
  nodeInputSchema,
  projectInputSchema,
  reviewInputSchema,
  type BackupData,
  type MilestoneInput,
  type NodeInput,
  type Project,
  type ProjectBundle,
  type ProjectInput,
  type ProjectStatus,
  type ReviewInput,
} from '../domain/types'
import { canTransition, nextNodePosition } from '../domain/rules'

const now = () => new Date().toISOString()
const id = () => crypto.randomUUID()

export const repository = {
  async listProjects() {
    return db.projects.orderBy('updatedAt').reverse().toArray()
  },
  async getBundle(projectId: string): Promise<ProjectBundle | null> {
    const project = await db.projects.get(projectId)
    if (!project) return null
    const [nodes, milestones, reviews] = await Promise.all([
      db.nodes.where('projectId').equals(projectId).sortBy('position'),
      db.milestones.where('projectId').equals(projectId).toArray(),
      db.reviews.where('projectId').equals(projectId).reverse().sortBy('createdAt'),
    ])
    return { project, nodes, milestones, reviews }
  },
  async createProject(input: ProjectInput) {
    const clean = projectInputSchema.parse(input)
    const timestamp = now()
    const project: Project = { id: id(), ...clean, createdAt: timestamp, updatedAt: timestamp }
    await db.projects.add(project)
    return project
  },
  async updateProject(projectId: string, input: ProjectInput) {
    const current = await db.projects.get(projectId)
    if (!current) throw new Error('项目不存在')
    const clean = projectInputSchema.parse(input)
    if (!canTransition(current.status, clean.status)) throw new Error('不允许直接切换到该状态')
    await db.projects.update(projectId, { ...clean, updatedAt: now() })
  },
  async setProjectStatus(projectId: string, status: ProjectStatus, force = false) {
    const project = await db.projects.get(projectId)
    if (!project) throw new Error('项目不存在')
    if (!canTransition(project.status, status)) throw new Error('不允许直接切换到该状态')
    if (status === 'completed' && !force) {
      const passed = await db.milestones.where('projectId').equals(projectId).filter((item) => item.result === 'passed').count()
      if (!passed) throw new Error('NO_PASSED_MILESTONE')
    }
    await db.projects.update(projectId, { status, updatedAt: now() })
  },
  async deleteProject(projectId: string) {
    await db.transaction('rw', db.projects, db.nodes, db.milestones, db.reviews, async () => {
      await Promise.all([
        db.nodes.where('projectId').equals(projectId).delete(),
        db.milestones.where('projectId').equals(projectId).delete(),
        db.reviews.where('projectId').equals(projectId).delete(),
      ])
      await db.projects.delete(projectId)
    })
  },
  async saveNode(projectId: string, input: NodeInput, nodeId?: string) {
    const clean = nodeInputSchema.parse(input)
    const timestamp = now()
    if (nodeId) {
      await db.nodes.update(nodeId, { ...clean, updatedAt: timestamp })
    } else {
      const nodes = await db.nodes.where('projectId').equals(projectId).toArray()
      await db.nodes.add({ id: id(), projectId, ...clean, position: nextNodePosition(nodes), createdAt: timestamp, updatedAt: timestamp })
    }
    await db.projects.update(projectId, { updatedAt: timestamp })
  },
  async deleteNode(nodeId: string) {
    const node = await db.nodes.get(nodeId)
    if (!node) return
    await db.transaction('rw', db.nodes, db.milestones, db.projects, async () => {
      await db.milestones.where('nodeId').equals(nodeId).delete()
      await db.nodes.delete(nodeId)
      const remaining = await db.nodes.where('projectId').equals(node.projectId).sortBy('position')
      await Promise.all(remaining.map((item, position) => db.nodes.update(item.id, { position })))
      await db.projects.update(node.projectId, { updatedAt: now() })
    })
  },
  async moveNode(nodeId: string, direction: -1 | 1) {
    const node = await db.nodes.get(nodeId)
    if (!node) return
    const nodes = await db.nodes.where('projectId').equals(node.projectId).sortBy('position')
    const index = nodes.findIndex((item) => item.id === nodeId)
    const target = nodes[index + direction]
    if (!target) return
    await db.transaction('rw', db.nodes, async () => {
      await db.nodes.update(node.id, { position: target.position, updatedAt: now() })
      await db.nodes.update(target.id, { position: node.position, updatedAt: now() })
    })
  },
  async saveMilestone(projectId: string, nodeId: string, input: MilestoneInput) {
    const clean = milestoneInputSchema.parse(input)
    const existing = await db.milestones.where('nodeId').equals(nodeId).first()
    const timestamp = now()
    const values = { ...clean, validatedAt: clean.result ? timestamp : null, updatedAt: timestamp }
    if (existing) await db.milestones.update(existing.id, values)
    else await db.milestones.add({ id: id(), projectId, nodeId, ...values, createdAt: timestamp })
    await db.projects.update(projectId, { updatedAt: timestamp })
  },
  async deleteMilestone(nodeId: string) {
    await db.milestones.where('nodeId').equals(nodeId).delete()
  },
  async saveReview(projectId: string, input: ReviewInput, reviewId?: string) {
    const clean = reviewInputSchema.parse(input)
    const timestamp = now()
    if (reviewId) await db.reviews.update(reviewId, { ...clean, updatedAt: timestamp })
    else await db.reviews.add({ id: id(), projectId, ...clean, createdAt: timestamp, updatedAt: timestamp })
  },
  async deleteReview(reviewId: string) {
    await db.reviews.delete(reviewId)
  },
  async exportData(): Promise<BackupData> {
    const [projects, nodes, milestones, reviews] = await Promise.all([
      db.projects.toArray(), db.nodes.toArray(), db.milestones.toArray(), db.reviews.toArray(),
    ])
    return { version: 1, exportedAt: now(), projects, nodes, milestones, reviews }
  },
  async importData(raw: unknown, mode: 'merge' | 'replace') {
    const entityBase = z.object({ id: z.string(), createdAt: z.string(), updatedAt: z.string() }).passthrough()
    const projectEntity = entityBase.extend({ trigger: z.string(), title: z.string(), status: z.string() })
    const nodeEntity = entityBase.extend({ projectId: z.string(), type: z.string(), content: z.string(), status: z.string(), log: z.string(), position: z.number().int().nonnegative() })
    const milestoneEntity = entityBase.extend({ projectId: z.string(), nodeId: z.string(), title: z.string(), method: z.string(), criteria: z.string(), result: z.string().nullable(), feeling: z.string(), validatedAt: z.string().nullable() })
    const reviewEntity = entityBase.extend({ projectId: z.string(), trigger: z.string(), health: z.string(), execution: z.string(), systemAdjustment: z.string() })
    const backupSchema = z.object({
      version: z.literal(1), exportedAt: z.string(),
      projects: z.array(projectEntity), nodes: z.array(nodeEntity), milestones: z.array(milestoneEntity), reviews: z.array(reviewEntity),
    })
    backupSchema.parse(raw)
    const data = raw as BackupData
    data.projects.forEach((item) => projectInputSchema.parse(item))
    data.nodes.forEach((item) => nodeInputSchema.parse(item))
    data.milestones.forEach((item) => milestoneInputSchema.parse(item))
    data.reviews.forEach((item) => reviewInputSchema.parse(item))
    await db.transaction('rw', db.projects, db.nodes, db.milestones, db.reviews, async () => {
      if (mode === 'replace') await Promise.all([db.projects.clear(), db.nodes.clear(), db.milestones.clear(), db.reviews.clear()])
      await db.projects.bulkPut(data.projects)
      await db.nodes.bulkPut(data.nodes)
      await db.milestones.bulkPut(data.milestones)
      await db.reviews.bulkPut(data.reviews)
    })
  },
}
