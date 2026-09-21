import { describe, expect, it } from 'vitest'
import type { NodeConnection, PraxisNode } from '../../domain/types'
import { getNodeConnectionGroups } from './nodeConnectionGroups'

const node = (id: string): PraxisNode => ({ id, projectId: 'p', type: 'question', content: '', status: 'advancing', log: '', position: 0, createdAt: '', updatedAt: '' })
const connection = (id: string, sourceNodeId: string, targetNodeId: string): NodeConnection => ({ id, projectId: 'p', sourceNodeId, targetNodeId, isPreferred: false, createdAt: '' })

describe('节点连接分组', () => {
  const nodeById = new Map([node('a'), node('b'), node('c')].map((item) => [item.id, item]))
  const connections = [connection('c1', 'a', 'b'), connection('c2', 'c', 'a'), connection('c3', 'a', 'ghost'), connection('c4', 'b', 'c')]

  it('按方向分为连入与连出，对方节点正确', () => {
    const { inbound, outbound } = getNodeConnectionGroups(connections, 'a', nodeById)
    expect(outbound.map((item) => item.counterpart.id)).toEqual(['b'])
    expect(inbound.map((item) => item.counterpart.id)).toEqual(['c'])
    expect(outbound[0].connection.id).toBe('c1')
    expect(inbound[0].connection.id).toBe('c2')
  })

  it('丢弃对方节点已不存在的脏边', () => {
    const { outbound } = getNodeConnectionGroups(connections, 'a', nodeById)
    expect(outbound.some((item) => item.connection.id === 'c3')).toBe(false)
  })

  it('保持连接原始顺序', () => {
    const { inbound } = getNodeConnectionGroups([...connections].reverse(), 'a', nodeById)
    expect(inbound.map((item) => item.connection.id)).toEqual(['c2'])
  })

  it('孤立节点返回双空组', () => {
    const { inbound, outbound } = getNodeConnectionGroups(connections, 'lonely', nodeById)
    expect(inbound).toHaveLength(0)
    expect(outbound).toHaveLength(0)
  })
})
