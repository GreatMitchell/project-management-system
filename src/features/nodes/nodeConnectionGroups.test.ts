import { describe, expect, it } from 'vitest'
import type { NodeConnection, PraxisNode } from '../../domain/types'
import { getConnectableCounterparts, getNodeConnectionGroups } from './nodeConnectionGroups'

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

describe('可连接的对方节点', () => {
  const nodes = [node('a'), node('b'), node('c'), node('d')]
  // 图结构：c → a → b（b 是 a 的下游，c 是 a 的上游），d 独立
  const chain = [connection('c1', 'a', 'b'), connection('c2', 'c', 'a')]

  it('科研项目排除自身与同向已连接，允许反向与任意其余节点', () => {
    const outbound = getConnectableCounterparts(nodes, chain, 'a', 'outbound', 'research').map((item) => item.id)
    const inbound = getConnectableCounterparts(nodes, chain, 'a', 'inbound', 'research').map((item) => item.id)
    expect(outbound).toEqual(['c', 'd'])
    expect(inbound).toEqual(['b', 'd'])
  })

  it('普通项目连出排除上游（会成环），连入排除下游（会成环）', () => {
    const outbound = getConnectableCounterparts(nodes, chain, 'a', 'outbound', 'general').map((item) => item.id)
    const inbound = getConnectableCounterparts(nodes, chain, 'a', 'inbound', 'general').map((item) => item.id)
    expect(outbound).toEqual(['d'])
    expect(inbound).toEqual(['d'])
  })

  it('修改边时排除被替换的旧边：原对方可选，其余重复仍排除', () => {
    const outbound = getConnectableCounterparts(nodes, chain, 'a', 'outbound', 'research', 'c1').map((item) => item.id)
    expect(outbound).toEqual(['b', 'c', 'd'])
  })

  it('修改边时环检查忽略被替换的旧边', () => {
    // 换掉 c1（a→b）后，a→b 不再占据通路，b 作为连出候选不再被普通项目环检查拦截
    const outbound = getConnectableCounterparts(nodes, chain, 'a', 'outbound', 'general', 'c1').map((item) => item.id)
    expect(outbound).toEqual(['b', 'd'])
  })
})
