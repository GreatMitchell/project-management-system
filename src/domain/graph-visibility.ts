import type { CurrentRoute } from './graph'
import type { NodeConnection, PraxisNode } from './types'

export interface CollapsibleBranch {
  id: string
  sourceNodeId: string
  targetNodeId: string
  nodeIds: string[]
}

export interface CollapsedGraph {
  visibleNodes: PraxisNode[]
  visibleConnections: NodeConnection[]
  hiddenNodeIds: Set<string>
  collapsedBranches: CollapsibleBranch[]
}

export function getCollapsibleBranches(nodes: PraxisNode[], connections: NodeConnection[], route: CurrentRoute): CollapsibleBranch[] {
  const nodeIds = new Set(nodes.map((node) => node.id)); const routeNodes = new Set(route.nodeIds); const routeEdges = new Set(route.connectionIds)
  const outgoing = new Map<string, NodeConnection[]>(); const incoming = new Map<string, NodeConnection[]>()
  for (const edge of connections) { if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) continue; outgoing.set(edge.sourceNodeId, [...(outgoing.get(edge.sourceNodeId) ?? []), edge]); incoming.set(edge.targetNodeId, [...(incoming.get(edge.targetNodeId) ?? []), edge]) }
  const branches: CollapsibleBranch[] = []
  for (const [sourceNodeId, edges] of outgoing) {
    if (edges.length < 2 && !routeNodes.has(sourceNodeId)) continue
    for (const rootEdge of edges) {
      if (routeEdges.has(rootEdge.id) || routeNodes.has(rootEdge.targetNodeId)) continue
      const candidates = new Set<string>(); const queue = [rootEdge.targetNodeId]
      while (queue.length) { const current = queue.shift()!; if (candidates.has(current) || routeNodes.has(current)) continue; candidates.add(current); for (const edge of outgoing.get(current) ?? []) queue.push(edge.targetNodeId) }
      let changed = true
      while (changed) {
        changed = false
        for (const candidate of [...candidates]) {
          const allowedRootInput = candidate === rootEdge.targetNodeId ? rootEdge.id : null
          const hasExternalInput = (incoming.get(candidate) ?? []).some((edge) => edge.id !== allowedRootInput && !candidates.has(edge.sourceNodeId))
          if (hasExternalInput) { candidates.delete(candidate); changed = true }
        }
      }
      if (candidates.has(rootEdge.targetNodeId) && candidates.size) branches.push({ id: rootEdge.id, sourceNodeId, targetNodeId: rootEdge.targetNodeId, nodeIds: [...candidates] })
    }
  }
  return branches
}

export function resolveCollapsedGraph(nodes: PraxisNode[], connections: NodeConnection[], branches: CollapsibleBranch[], collapsedBranchIds: Set<string>): CollapsedGraph {
  const collapsedBranches = branches.filter((branch) => collapsedBranchIds.has(branch.id)); const hiddenNodeIds = new Set(collapsedBranches.flatMap((branch) => branch.nodeIds))
  return { visibleNodes: nodes.filter((node) => !hiddenNodeIds.has(node.id)), visibleConnections: connections.filter((edge) => !hiddenNodeIds.has(edge.sourceNodeId) && !hiddenNodeIds.has(edge.targetNodeId)), hiddenNodeIds, collapsedBranches }
}

export function findCollapsedBranchForNode(nodeId: string, branches: CollapsibleBranch[], collapsedBranchIds: Set<string>) {
  return branches.find((branch) => collapsedBranchIds.has(branch.id) && branch.nodeIds.includes(nodeId)) ?? null
}
