import { describe, expect, it } from 'vitest'
import type { PraxisNode } from '../../domain/types'
import { filterNodesForSearch, searchStatusOptions, searchTypeOptions } from './nodeSearchFilter'

const node = (id: string, overrides: Partial<PraxisNode> = {}): PraxisNode => ({ id, projectId: 'p', type: 'question', content: '', status: 'advancing', log: '', position: 0, createdAt: '', updatedAt: '', ...overrides })

describe('搜索节点筛选', () => {
  const nodes = [
    node('q', { type: 'question', content: '如何验证', status: 'exploring' }),
    node('s', { type: 'solution', content: '方案 Alpha', log: '记录 Redis', status: 'advancing' }),
    node('r', { type: 'result', content: '结论草稿', status: 'completed' }),
    node('a', { type: 'assumption', content: '假设成立', status: null }),
    node('v', { type: 'vulnerability', content: '漏洞报告', status: null, vulnerabilityStatus: 'open' }),
  ]

  it('关键字命中内容与日志且不区分大小写', () => {
    expect(filterNodesForSearch(nodes, '验证', new Set(), new Set()).map((n) => n.id)).toEqual(['q'])
    expect(filterNodesForSearch(nodes, 'redis', new Set(), new Set()).map((n) => n.id)).toEqual(['s'])
  })

  it('空关键字与空筛选返回全量', () => {
    expect(filterNodesForSearch(nodes, '', new Set(), new Set())).toHaveLength(5)
  })

  it('类型筛选支持多选交集', () => {
    expect(filterNodesForSearch(nodes, '', new Set(['question', 'solution']), new Set()).map((n) => n.id)).toEqual(['q', 's'])
  })

  it('状态筛选命中对应节点，无状态仅命中 status=null 的假设节点', () => {
    expect(filterNodesForSearch(nodes, '', new Set(), new Set(['completed'])).map((n) => n.id)).toEqual(['r'])
    expect(filterNodesForSearch(nodes, '', new Set(), new Set(['none'])).map((n) => n.id)).toEqual(['a'])
    expect(filterNodesForSearch(nodes, '', new Set(), new Set(['exploring', 'none'])).map((n) => n.id)).toEqual(['q', 'a'])
  })

  it('缺陷节点按缺陷状态匹配，不落入无状态', () => {
    expect(filterNodesForSearch(nodes, '', new Set(), new Set(['open'])).map((n) => n.id)).toEqual(['v'])
    expect(filterNodesForSearch(nodes, '', new Set(), new Set(['conquered']))).toHaveLength(0)
    expect(filterNodesForSearch(nodes, '', new Set(), new Set(['exploring', 'open'])).map((n) => n.id)).toEqual(['q', 'v'])
  })

  it('缺陷节点缺失状态视同待探索', () => {
    const legacy = [node('v2', { type: 'vulnerability', status: null })]
    expect(filterNodesForSearch(legacy, '', new Set(), new Set(['unexplored'])).map((n) => n.id)).toEqual(['v2'])
    expect(filterNodesForSearch(legacy, '', new Set(), new Set(['none']))).toHaveLength(0)
  })

  it('关键字、类型、状态三条件叠加取交集', () => {
    expect(filterNodesForSearch(nodes, '', new Set(['solution']), new Set(['completed']))).toHaveLength(0)
    expect(filterNodesForSearch(nodes, '记录', new Set(['solution']), new Set(['advancing'])).map((n) => n.id)).toEqual(['s'])
  })

  it('类型选项按项目类型裁剪', () => {
    expect(searchTypeOptions('general')).toEqual(['question', 'solution', 'result'])
    expect(searchTypeOptions('research')).toEqual(['question', 'solution', 'result', 'assumption', 'vulnerability'])
  })

  it('状态选项仅科研项目包含缺陷状态与无状态', () => {
    expect(searchStatusOptions('general').map((option) => option.value)).toEqual(['exploring', 'advancing', 'paused', 'completed', 'abandoned'])
    expect(searchStatusOptions('research').map((option) => option.value)).toEqual(['exploring', 'advancing', 'paused', 'completed', 'abandoned', 'unexplored', 'patched', 'open', 'conquered', 'none'])
  })
})
