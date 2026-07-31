import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/database'
import type { BackupDataV1 } from '../domain/types'
import { repository } from './repository'

beforeEach(async () => { await db.delete(); await db.open() })

const input = (content: string) => ({ type: 'question' as const, content, status: 'advancing' as const, log: '' })

async function projectWithNodes() {
  const project = await repository.createProject({ title: '实践项目', trigger: '真实需求', status: 'exploring' })
  const first = (await repository.saveNode(project.id, input('起点')))!
  const second = (await repository.saveNode(project.id, input('第二节点'), undefined, first.id))!
  return { project, first, second }
}

describe('repository', () => {
  it('保存孤立节点，并从前驱原子创建连接', async () => {
    const { project, first, second } = await projectWithNodes()
    const bundle = await repository.getBundle(project.id)
    expect(bundle?.nodes).toHaveLength(2)
    expect(bundle?.connections).toEqual([expect.objectContaining({ sourceNodeId: first.id, targetNodeId: second.id })])
  })

  it('允许分支和汇合', async () => {
    const { project, first, second } = await projectWithNodes()
    const branch = (await repository.saveNode(project.id, input('支线'), undefined, first.id))!
    const merge = (await repository.saveNode(project.id, input('汇合结果'), undefined, second.id))!
    await repository.createConnection(project.id, branch.id, merge.id)
    const connections = (await repository.getBundle(project.id))!.connections
    expect(connections.filter((item) => item.sourceNodeId === first.id)).toHaveLength(2)
    expect(connections.filter((item) => item.targetNodeId === merge.id)).toHaveLength(2)
  })

  it('拒绝自连接、重复连接和间接成环', async () => {
    const { project, first, second } = await projectWithNodes()
    await expect(repository.createConnection(project.id, first.id, first.id)).rejects.toThrow('自身')
    await expect(repository.createConnection(project.id, first.id, second.id)).rejects.toThrow('已经存在')
    const third = (await repository.saveNode(project.id, input('第三节点'), undefined, second.id))!
    await expect(repository.createConnection(project.id, third.id, first.id)).rejects.toThrow('形成环')
  })

  it('删除节点只清理关联边，保留下游节点', async () => {
    const { project, first, second } = await projectWithNodes()
    const third = (await repository.saveNode(project.id, input('下游'), undefined, second.id))!
    await repository.deleteNode(second.id)
    const bundle = (await repository.getBundle(project.id))!
    expect(bundle.nodes.map((node) => node.id)).toEqual([first.id, third.id])
    expect(bundle.connections).toHaveLength(0)
  })

  it('删除项目时清理全部关联数据和连接', async () => {
    const { project, second } = await projectWithNodes()
    await repository.saveMilestone(project.id, second.id, { title: '验证', method: '运行测试', criteria: '测试通过', result: 'passed', feeling: '符合预期' })
    await repository.saveReview(project.id, { trigger: 'milestone', health: '健康', execution: '正常', systemAdjustment: '无需调整' })
    await repository.deleteProject(project.id)
    expect(await repository.getBundle(project.id)).toBeNull()
    expect(await db.nodes.count()).toBe(0)
    expect(await db.nodeConnections.count()).toBe(0)
    expect(await db.milestones.count()).toBe(0)
    expect(await db.reviews.count()).toBe(0)
  })

  it('没有通过的里程碑时阻止普通完成', async () => {
    const project = await repository.createProject({ title: '受约束项目', trigger: '验证完成规则', status: 'advancing' })
    await expect(repository.setProjectStatus(project.id, 'completed')).rejects.toThrow('NO_PASSED_MILESTONE')
  })

  it('导入 version 1 备份时补建线性连接', async () => {
    const { project } = await projectWithNodes()
    const current = await repository.exportData()
    const legacy: BackupDataV1 = { version: 1, exportedAt: current.exportedAt, projects: current.projects, nodes: current.nodes, milestones: [], reviews: [] }
    await repository.importData(legacy, 'replace')
    const bundle = (await repository.getBundle(project.id))!
    expect(bundle.connections).toHaveLength(1)
    expect(bundle.connections[0]).toMatchObject({ sourceNodeId: bundle.nodes[0].id, targetNodeId: bundle.nodes[1].id })
  })

  it('version 2 备份完整往返图连接', async () => {
    const { project } = await projectWithNodes()
    const backup = await repository.exportData()
    expect(backup.version).toBe(2)
    await repository.importData(backup, 'replace')
    expect((await repository.getBundle(project.id))?.connections).toHaveLength(1)
  })
})
