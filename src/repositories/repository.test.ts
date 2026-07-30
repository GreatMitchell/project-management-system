import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/database'
import { repository } from './repository'

beforeEach(async () => { await db.delete(); await db.open() })

describe('repository', () => {
  it('创建项目并持久化节点', async () => {
    const project = await repository.createProject({ title: '实践项目', trigger: '真实需求', status: 'exploring' })
    await repository.saveNode(project.id, { type: 'question', content: '核心问题', status: 'advancing', log: '' })
    const bundle = await repository.getBundle(project.id)
    expect(bundle?.project.title).toBe('实践项目')
    expect(bundle?.nodes).toHaveLength(1)
    expect(bundle?.nodes[0].position).toBe(0)
  })
  it('删除项目时清理全部关联数据', async () => {
    const project = await repository.createProject({ title: '待删除项目', trigger: '测试级联清理', status: 'exploring' })
    await repository.saveNode(project.id, { type: 'result', content: '结果', status: 'completed', log: '' })
    const node = (await repository.getBundle(project.id))!.nodes[0]
    await repository.saveMilestone(project.id, node.id, { title: '验证', method: '运行测试', criteria: '测试通过', result: 'passed', feeling: '符合预期' })
    await repository.saveReview(project.id, { trigger: 'milestone', health: '健康', execution: '正常', systemAdjustment: '无需调整' })
    await repository.deleteProject(project.id)
    expect(await repository.getBundle(project.id)).toBeNull()
    expect(await db.nodes.count()).toBe(0)
    expect(await db.milestones.count()).toBe(0)
    expect(await db.reviews.count()).toBe(0)
  })
  it('没有通过的里程碑时阻止普通完成', async () => {
    const project = await repository.createProject({ title: '受约束项目', trigger: '验证完成规则', status: 'advancing' })
    await expect(repository.setProjectStatus(project.id, 'completed')).rejects.toThrow('NO_PASSED_MILESTONE')
  })
})
