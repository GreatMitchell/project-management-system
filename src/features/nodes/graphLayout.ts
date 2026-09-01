import dagre from '@dagrejs/dagre'
import type { GraphPosition, NodeConnection, PraxisNode } from '../../domain/types'

export const graphNodeWidth = 336
export const graphLayoutNodeHeight = 236
export const branchSummaryWidth = 190
export const branchSummaryHeight = 96
export const graphNodeGap = 48
const graphRankGap = 118

const isFinitePosition = (position: GraphPosition | undefined): position is GraphPosition => Boolean(position && Number.isFinite(position.x) && Number.isFinite(position.y))

export function layoutGraph(nodes: readonly Pick<PraxisNode, 'id'>[], connections: readonly Pick<NodeConnection, 'sourceNodeId' | 'targetNodeId'>[]) {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  const nodeIds = new Set(nodes.map((node) => node.id))
  graph.setGraph({ rankdir: 'LR', ranksep: graphRankGap, nodesep: 70, marginx: 70, marginy: 65 })
  nodes.forEach((node) => graph.setNode(node.id, { width: graphNodeWidth, height: graphLayoutNodeHeight }))
  connections.forEach((edge) => { if (nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId)) graph.setEdge(edge.sourceNodeId, edge.targetNodeId) })
  dagre.layout(graph)
  return new Map(nodes.map((node) => { const point = graph.node(node.id); return [node.id, { x: point.x - graphNodeWidth / 2, y: point.y - graphLayoutNodeHeight / 2 }] as const }))
}

export function findAvailableGraphPosition(preferred: GraphPosition, occupied: readonly GraphPosition[]) {
  const isFree = (candidate: GraphPosition) => occupied.every((position) => (
    candidate.x + graphNodeWidth + graphNodeGap <= position.x
    || position.x + graphNodeWidth + graphNodeGap <= candidate.x
    || candidate.y + graphLayoutNodeHeight + graphNodeGap <= position.y
    || position.y + graphLayoutNodeHeight + graphNodeGap <= candidate.y
  ))
  if (isFree(preferred)) return preferred
  const stepX = graphNodeWidth + graphNodeGap; const stepY = graphLayoutNodeHeight + graphNodeGap
  for (let radius = 1; ; radius += 1) {
    const offsets: { x: number; y: number }[] = []
    for (let x = -radius; x <= radius; x += 1) for (let y = -radius; y <= radius; y += 1) if (Math.max(Math.abs(x), Math.abs(y)) === radius) offsets.push({ x, y })
    offsets.sort((left, right) => left.x * left.x + left.y * left.y - right.x * right.x - right.y * right.y || left.y - right.y || left.x - right.x)
    for (const offset of offsets) { const candidate = { x: preferred.x + offset.x * stepX, y: preferred.y + offset.y * stepY }; if (isFree(candidate)) return candidate }
  }
}

export function initializeGraphPositions(nodes: readonly PraxisNode[], connections: readonly NodeConnection[], cachedPositions: ReadonlyMap<string, GraphPosition>, viewportCenter: GraphPosition) {
  const positions = new Map<string, GraphPosition>()
  for (const node of nodes) { const position = node.graphPosition ?? cachedPositions.get(node.id); if (isFinitePosition(position)) positions.set(node.id, position) }
  if (nodes.length > 1 && positions.size === 0) { const generated = layoutGraph(nodes, connections); return { positions: generated, generated } }

  const generated = new Map<string, GraphPosition>(); const incoming = new Map<string, NodeConnection[]>()
  for (const edge of connections) incoming.set(edge.targetNodeId, [...(incoming.get(edge.targetNodeId) ?? []), edge])
  for (const node of nodes) {
    if (positions.has(node.id)) continue
    const predecessor = (incoming.get(node.id) ?? []).map((edge) => positions.get(edge.sourceNodeId)).find(isFinitePosition)
    const preferred = predecessor
      ? { x: predecessor.x + graphNodeWidth + graphRankGap, y: predecessor.y }
      : { x: viewportCenter.x - graphNodeWidth / 2, y: viewportCenter.y - graphLayoutNodeHeight / 2 }
    const position = findAvailableGraphPosition(preferred, [...positions.values()]); positions.set(node.id, position); generated.set(node.id, position)
  }
  return { positions, generated }
}
