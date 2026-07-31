import { describe, expect, it } from 'vitest'
import type { CurrentRoute } from './graph'
import { findCollapsedBranchForNode, getCollapsibleBranches, resolveCollapsedGraph } from './graph-visibility'
import type { NodeConnection, PraxisNode } from './types'
const node = (id: string, position: number): PraxisNode => ({ id, projectId: 'p', type: 'question', content: id, status: 'advancing', log: '', position, createdAt: '', updatedAt: '' })
const edge = (sourceNodeId: string, targetNodeId: string): NodeConnection => ({ id: `${sourceNodeId}-${targetNodeId}`, projectId: 'p', sourceNodeId, targetNodeId, isPreferred: false, createdAt: '' })
const route = (nodeIds: string[], connectionIds: string[] = []): CurrentRoute => ({ nodeIds, connectionIds, complete: true, needsChoiceNodeId: null, invalid: false })
describe('路线图支线可见性', () => {
  it('识别并折叠非当前路线支线', () => { const nodes = ['a','b','c','d'].map((id,i) => node(id,i)); const edges = [edge('a','b'),edge('a','c'),edge('c','d')]; const branches = getCollapsibleBranches(nodes, edges, route(['b','a'],['a-b'])); expect(branches).toEqual([expect.objectContaining({ id:'a-c', nodeIds:expect.arrayContaining(['c','d']) })]); const graph = resolveCollapsedGraph(nodes, edges, branches, new Set(['a-c'])); expect(graph.visibleNodes.map((item) => item.id)).toEqual(['a','b']); expect(graph.hiddenNodeIds.size).toBe(2) })
  it('不允许折叠当前路线分支', () => { const nodes = ['a','b','c'].map((id,i) => node(id,i)); const branches = getCollapsibleBranches(nodes,[edge('a','b'),edge('a','c')],route(['b','a'],['a-b'])); expect(branches.map((item) => item.id)).toEqual(['a-c']) })
  it('重新汇合时保留共享路线节点', () => { const nodes = ['a','b','c','d'].map((id,i) => node(id,i)); const edges = [edge('a','b'),edge('a','c'),edge('c','d'),edge('b','d')]; const branches = getCollapsibleBranches(nodes,edges,route(['d','b','a'],['b-d','a-b'])); expect(branches[0].nodeIds).toEqual(['c']); const graph = resolveCollapsedGraph(nodes,edges,branches,new Set(['a-c'])); expect(graph.visibleNodes.map((item) => item.id)).toContain('d') })
  it('共享下游节点不被隐藏', () => { const nodes = ['a','b','c','x','d'].map((id,i) => node(id,i)); const edges = [edge('a','b'),edge('a','c'),edge('c','d'),edge('x','d')]; const branches = getCollapsibleBranches(nodes,edges,route(['b','a'],['a-b'])); expect(branches[0].nodeIds).toEqual(['c']); })
  it('能够找到包含目标的已折叠支线', () => { const branch = { id:'a-c',sourceNodeId:'a',targetNodeId:'c',nodeIds:['c','d'] }; expect(findCollapsedBranchForNode('d',[branch],new Set(['a-c']))?.id).toBe('a-c'); expect(findCollapsedBranchForNode('a',[branch],new Set(['a-c']))).toBeNull() })
})
