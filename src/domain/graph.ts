import type { NodeConnection, PraxisNode } from './types'

export interface CurrentRoute {
  nodeIds: string[]
  connectionIds: string[]
  complete: boolean
  needsChoiceNodeId: string | null
  invalid: boolean
}

export function buildLinearConnections(nodes: PraxisNode[], createId: () => string = () => crypto.randomUUID()): NodeConnection[] {
  const byProject = new Map<string, PraxisNode[]>()
  for (const node of nodes) { const items = byProject.get(node.projectId) ?? []; items.push(node); byProject.set(node.projectId, items) }
  return [...byProject.entries()].flatMap(([projectId, items]) => {
    const ordered = [...items].sort((a, b) => a.position - b.position)
    return ordered.slice(1).map((node, index) => ({ id: createId(), projectId, sourceNodeId: ordered[index].id, targetNodeId: node.id, isPreferred: false, createdAt: node.createdAt }))
  })
}

export function validateConnectionSet(nodes: PraxisNode[], connections: NodeConnection[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node])); const keys = new Set<string>(); const adjacency = new Map<string, string[]>(); const preferredTargets = new Set<string>()
  for (const connection of connections) {
    const source = nodeById.get(connection.sourceNodeId); const target = nodeById.get(connection.targetNodeId)
    if (!source || !target || source.projectId !== connection.projectId || target.projectId !== connection.projectId) throw new Error('连接包含不存在或不属于该项目的节点')
    if (source.id === target.id) throw new Error('节点不能连接到自身')
    const key = `${connection.projectId}:${source.id}:${target.id}`; if (keys.has(key)) throw new Error('两个节点之间已经存在连接'); keys.add(key)
    if (connection.isPreferred) { const targetKey = `${connection.projectId}:${target.id}`; if (preferredTargets.has(targetKey)) throw new Error('同一个汇合节点只能有一个首选前驱'); preferredTargets.add(targetKey) }
    adjacency.set(source.id, [...(adjacency.get(source.id) ?? []), target.id])
  }
  const visiting = new Set<string>(); const visited = new Set<string>()
  const visit = (nodeId: string): boolean => { if (visiting.has(nodeId)) return true; if (visited.has(nodeId)) return false; visiting.add(nodeId); if ((adjacency.get(nodeId) ?? []).some(visit)) return true; visiting.delete(nodeId); visited.add(nodeId); return false }
  if (nodes.some((node) => visit(node.id))) throw new Error('该连接会形成环，任务图只允许向前发展')
}

export function getIncomingConnections(nodeId: string, connections: NodeConnection[]) { return connections.filter((item) => item.targetNodeId === nodeId) }

export function resolveCurrentRoute(nodes: PraxisNode[], connections: NodeConnection[], activeNodeId: string | null): CurrentRoute {
  if (!activeNodeId) return { nodeIds: [], connectionIds: [], complete: false, needsChoiceNodeId: null, invalid: false }
  const nodeById = new Map(nodes.map((node) => [node.id, node])); const active = nodeById.get(activeNodeId)
  if (!active) return { nodeIds: [], connectionIds: [], complete: false, needsChoiceNodeId: null, invalid: true }
  const nodeIds = [activeNodeId]; const connectionIds: string[] = []; const visited = new Set([activeNodeId]); let currentId = activeNodeId
  while (true) {
    const incoming = getIncomingConnections(currentId, connections)
    if (!incoming.length) return { nodeIds, connectionIds, complete: true, needsChoiceNodeId: null, invalid: false }
    const preferred = incoming.filter((item) => item.isPreferred)
    if (incoming.length > 1 && preferred.length !== 1) return { nodeIds, connectionIds, complete: false, needsChoiceNodeId: currentId, invalid: preferred.length > 1 }
    const selected = incoming.length === 1 ? incoming[0] : preferred[0]
    const source = nodeById.get(selected.sourceNodeId)
    if (!source || source.projectId !== active.projectId || visited.has(source.id)) return { nodeIds, connectionIds, complete: false, needsChoiceNodeId: null, invalid: true }
    connectionIds.push(selected.id); nodeIds.push(source.id); visited.add(source.id); currentId = source.id
  }
}

export function calculateRouteProgress(routeNodeIds: string[], nodes: PraxisNode[]) {
  const routeSet = new Set(routeNodeIds); const effective = nodes.filter((node) => routeSet.has(node.id) && node.status !== 'abandoned'); const completed = effective.filter((node) => node.status === 'completed').length
  return { completed, total: effective.length, percent: effective.length ? Math.round((completed / effective.length) * 100) : 0 }
}
