import type { NodeConnection, PraxisNode } from './types'

export function buildLinearConnections(nodes: PraxisNode[], createId: () => string = () => crypto.randomUUID()): NodeConnection[] {
  const byProject = new Map<string, PraxisNode[]>()
  for (const node of nodes) {
    const projectNodes = byProject.get(node.projectId) ?? []
    projectNodes.push(node)
    byProject.set(node.projectId, projectNodes)
  }
  return [...byProject.entries()].flatMap(([projectId, projectNodes]) => {
    const ordered = [...projectNodes].sort((a, b) => a.position - b.position)
    return ordered.slice(1).map((node, index) => ({
      id: createId(), projectId, sourceNodeId: ordered[index].id, targetNodeId: node.id, createdAt: node.createdAt,
    }))
  })
}

export function validateConnectionSet(nodes: PraxisNode[], connections: NodeConnection[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const endpointKeys = new Set<string>()
  const adjacency = new Map<string, string[]>()
  for (const connection of connections) {
    const source = nodeById.get(connection.sourceNodeId)
    const target = nodeById.get(connection.targetNodeId)
    if (!source || !target || source.projectId !== connection.projectId || target.projectId !== connection.projectId) throw new Error('连接包含不存在或不属于该项目的节点')
    if (source.id === target.id) throw new Error('节点不能连接到自身')
    const key = `${connection.projectId}:${source.id}:${target.id}`
    if (endpointKeys.has(key)) throw new Error('两个节点之间已经存在连接')
    endpointKeys.add(key)
    adjacency.set(source.id, [...(adjacency.get(source.id) ?? []), target.id])
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) return true
    if (visited.has(nodeId)) return false
    visiting.add(nodeId)
    if ((adjacency.get(nodeId) ?? []).some(visit)) return true
    visiting.delete(nodeId)
    visited.add(nodeId)
    return false
  }
  if (nodes.some((node) => visit(node.id))) throw new Error('该连接会形成环，任务图只允许向前发展')
}
