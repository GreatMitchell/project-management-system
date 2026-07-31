import { describe, expect, it } from 'vitest'
import { buildLinearConnections, calculateRouteProgress, resolveCurrentRoute, validateConnectionSet } from './graph'
import type { NodeConnection, PraxisNode } from './types'
const node = (id: string, position: number, status: PraxisNode['status'] = 'advancing'): PraxisNode => ({ id, projectId: 'p1', type: 'question', content: id, status, log: '', position, createdAt: '', updatedAt: '' })
const edge = (sourceNodeId: string, targetNodeId: string, isPreferred = false): NodeConnection => ({ id: `${sourceNodeId}-${targetNodeId}`, projectId: 'p1', sourceNodeId, targetNodeId, isPreferred, createdAt: '' })
describe('当前路线规则', () => {
  it('旧节点转换为线性连接', () => { expect(buildLinearConnections([node('b', 1), node('a', 0)], () => 'e')).toEqual([expect.objectContaining({ sourceNodeId: 'a', targetNodeId: 'b', isPreferred: false })]) })
  it('完整回溯线性路线并隔离支线', () => { const nodes = [node('a', 0), node('b', 1), node('c', 2)]; const route = resolveCurrentRoute(nodes, [edge('a', 'b'), edge('a', 'c')], 'b'); expect(route).toMatchObject({ nodeIds: ['b', 'a'], complete: true }); expect(route.nodeIds).not.toContain('c') })
  it('汇合无首选时要求选择', () => { const nodes = [node('a', 0), node('b', 1), node('c', 2)]; expect(resolveCurrentRoute(nodes, [edge('a', 'c'), edge('b', 'c')], 'c')).toMatchObject({ nodeIds: ['c'], complete: false, needsChoiceNodeId: 'c' }) })
  it('沿首选前驱解析多级汇合', () => { const nodes = ['a', 'b', 'c', 'd', 'e'].map((id, i) => node(id, i)); const route = resolveCurrentRoute(nodes, [edge('a', 'c', true), edge('b', 'c'), edge('c', 'e', true), edge('d', 'e')], 'e'); expect(route).toMatchObject({ nodeIds: ['e', 'c', 'a'], complete: true }) })
  it('处理无目标、无效目标和损坏环', () => { const nodes = [node('a', 0), node('b', 1)]; expect(resolveCurrentRoute(nodes, [], null).nodeIds).toEqual([]); expect(resolveCurrentRoute(nodes, [], 'missing').invalid).toBe(true); expect(resolveCurrentRoute(nodes, [edge('a', 'b'), edge('b', 'a')], 'b').invalid).toBe(true) })
  it('路线进度排除弃用节点', () => { expect(calculateRouteProgress(['a', 'b', 'c'], [node('a', 0, 'completed'), node('b', 1, 'abandoned'), node('c', 2)])).toEqual({ completed: 1, total: 2, percent: 50 }) })
  it('拒绝重复首选前驱和环', () => { const nodes = [node('a', 0), node('b', 1), node('c', 2)]; expect(() => validateConnectionSet(nodes, [edge('a', 'c', true), edge('b', 'c', true)])).toThrow('一个首选'); expect(() => validateConnectionSet(nodes, [edge('a', 'b'), edge('b', 'a')])).toThrow('形成环') })
})
