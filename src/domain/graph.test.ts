import { describe, expect, it } from 'vitest'
import { buildLinearConnections, validateConnectionSet } from './graph'
import type { NodeConnection, PraxisNode } from './types'

const node = (id: string, position: number, projectId = 'p1'): PraxisNode => ({ id, projectId, type: 'question', content: id, status: 'advancing', log: '', position, createdAt: `t${position}`, updatedAt: `t${position}` })
const edge = (sourceNodeId: string, targetNodeId: string): NodeConnection => ({ id: `${sourceNodeId}-${targetNodeId}`, projectId: 'p1', sourceNodeId, targetNodeId, createdAt: '' })

describe('任务图规则', () => {
  it('按项目和 position 将旧节点转换为线性连接', () => {
    const connections = buildLinearConnections([node('b', 1), node('a', 0), node('other', 0, 'p2')], () => 'edge')
    expect(connections).toEqual([expect.objectContaining({ sourceNodeId: 'a', targetNodeId: 'b' })])
  })

  it('接受分支和汇合的无环图', () => {
    const nodes = [node('a', 0), node('b', 1), node('c', 2), node('d', 3)]
    expect(() => validateConnectionSet(nodes, [edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd')])).not.toThrow()
  })

  it('检测深层环、重复边和非法端点', () => {
    const nodes = [node('a', 0), node('b', 1), node('c', 2)]
    expect(() => validateConnectionSet(nodes, [edge('a', 'b'), edge('b', 'c'), edge('c', 'a')])).toThrow('形成环')
    expect(() => validateConnectionSet(nodes, [edge('a', 'b'), edge('a', 'b')])).toThrow('已经存在')
    expect(() => validateConnectionSet(nodes, [edge('a', 'missing')])).toThrow('不存在')
  })
})
