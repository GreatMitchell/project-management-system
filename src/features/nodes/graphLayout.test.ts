import { describe, expect, it } from 'vitest'
import type { GraphPosition, NodeConnection, PraxisNode } from '../../domain/types'
import { findAvailableGraphPosition, graphLayoutNodeHeight, graphNodeGap, graphNodeWidth, initializeGraphPositions, layoutGraph } from './graphLayout'

const node = (id: string, position: number, graphPosition?: GraphPosition): PraxisNode => ({ id, projectId: 'project', type: 'question', content: id, status: 'exploring', log: '', position, graphPosition, createdAt: '', updatedAt: '' })
const edge = (id: string, sourceNodeId: string, targetNodeId: string): NodeConnection => ({ id, projectId: 'project', sourceNodeId, targetNodeId, isPreferred: false, createdAt: '' })
const overlaps = (left: GraphPosition, right: GraphPosition, gap = 0) => !(left.x + graphNodeWidth + gap <= right.x || right.x + graphNodeWidth + gap <= left.x || left.y + graphLayoutNodeHeight + gap <= right.y || right.y + graphLayoutNodeHeight + gap <= left.y)

describe('路线图布局', () => {
  it('完整布局覆盖独立节点与科研环路且不会重叠', () => {
    const nodes = [node('a', 0), node('b', 1), node('c', 2), node('independent', 3)]
    const positions = layoutGraph(nodes, [edge('ab', 'a', 'b'), edge('bc', 'b', 'c'), edge('ca', 'c', 'a')])
    expect([...positions.keys()]).toEqual(nodes.map((item) => item.id))
    for (const position of positions.values()) { expect(Number.isFinite(position.x)).toBe(true); expect(Number.isFinite(position.y)).toBe(true) }
    const values = [...positions.values()]; for (let left = 0; left < values.length; left += 1) for (let right = left + 1; right < values.length; right += 1) expect(overlaps(values[left], values[right])).toBe(false)
  })

  it('从期望位置附近选择具有安全间距的最近空位', () => {
    const preferred = { x: 100, y: 200 }; const occupied = [preferred]
    const available = findAvailableGraphPosition(preferred, occupied)
    expect(available).not.toEqual(preferred)
    expect(overlaps(available, preferred, graphNodeGap)).toBe(false)
    expect(findAvailableGraphPosition(preferred, [])).toEqual(preferred)
  })

  it('局部放置保留已有坐标，将新连接节点放在前驱右侧', () => {
    const firstPosition = { x: 40, y: 80 }; const nodes = [node('first', 0, firstPosition), node('next', 1)]
    const resolved = initializeGraphPositions(nodes, [edge('connection', 'first', 'next')], new Map(), { x: 900, y: 600 })
    expect(resolved.positions.get('first')).toEqual(firstPosition)
    expect(resolved.positions.get('next')?.x).toBeGreaterThan(firstPosition.x + graphNodeWidth)
    expect(resolved.positions.get('next')?.y).toBe(firstPosition.y)
    expect([...resolved.generated.keys()]).toEqual(['next'])
  })

  it('独立节点围绕当前视口中心放置并避开现有节点', () => {
    const center = { x: 700, y: 500 }; const centered = { x: center.x - graphNodeWidth / 2, y: center.y - graphLayoutNodeHeight / 2 }
    const nodes = [node('occupied', 0, centered), node('new', 1)]
    const resolved = initializeGraphPositions(nodes, [], new Map(), center); const position = resolved.positions.get('new')!
    expect(overlaps(position, centered, graphNodeGap)).toBe(false)
    expect(Math.hypot(position.x - centered.x, position.y - centered.y)).toBeLessThan(graphNodeWidth + graphLayoutNodeHeight + graphNodeGap * 2)
  })

  it('首次打开多个旧节点时只生成一次完整初始布局', () => {
    const nodes = [node('first', 0), node('second', 1)]; const connections = [edge('connection', 'first', 'second')]
    const initial = initializeGraphPositions(nodes, connections, new Map(), { x: 0, y: 0 })
    expect(initial.generated.size).toBe(2)
    const restored = initializeGraphPositions(nodes, connections, initial.positions, { x: 5000, y: 5000 })
    expect(restored.generated.size).toBe(0)
    expect(restored.positions).toEqual(initial.positions)
  })
})
