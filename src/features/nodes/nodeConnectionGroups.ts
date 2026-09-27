import type { NodeConnection, PraxisNode, ProjectType } from '../../domain/types'

export interface NodeConnectionItem { connection: NodeConnection; counterpart: PraxisNode }

export function getNodeConnectionGroups(connections: readonly NodeConnection[], nodeId: string, nodeById: ReadonlyMap<string, PraxisNode>): { inbound: NodeConnectionItem[]; outbound: NodeConnectionItem[] } {
  const inbound: NodeConnectionItem[] = []
  const outbound: NodeConnectionItem[] = []
  for (const connection of connections) {
    if (connection.sourceNodeId === nodeId) {
      const counterpart = nodeById.get(connection.targetNodeId)
      if (counterpart) outbound.push({ connection, counterpart })
    } else if (connection.targetNodeId === nodeId) {
      const counterpart = nodeById.get(connection.sourceNodeId)
      if (counterpart) inbound.push({ connection, counterpart })
    }
  }
  return { inbound, outbound }
}

// 沿 forward 方向（source→target）或 backward 方向（target→source）从 startNodeId 做广度优先遍历，返回可达节点集合（含起点）。
function collectReachable(connections: readonly NodeConnection[], startNodeId: string, order: 'forward' | 'backward'): Set<string> {
  const adjacency = new Map<string, string[]>()
  for (const connection of connections) {
    const [from, to] = order === 'forward' ? [connection.sourceNodeId, connection.targetNodeId] : [connection.targetNodeId, connection.sourceNodeId]
    adjacency.set(from, [...(adjacency.get(from) ?? []), to])
  }
  const visited = new Set<string>([startNodeId]); const queue = [startNodeId]
  while (queue.length) {
    const current = queue.shift()!
    for (const next of adjacency.get(current) ?? []) if (!visited.has(next)) { visited.add(next); queue.push(next) }
  }
  return visited
}

// 从面板建立或修改连接时可选择的对方节点：排除自身、同向已连接的节点；普通项目还排除会形成环的节点（连出不能选已能到达本节点的节点，连入不能选本节点已能到达的节点）。excludeConnectionId 用于修改既有边：被替换的旧边不参与过滤，使原对方节点仍可选。
export function getConnectableCounterparts(nodes: readonly PraxisNode[], connections: readonly NodeConnection[], nodeId: string, direction: 'inbound' | 'outbound', projectType: ProjectType, excludeConnectionId?: string): PraxisNode[] {
  const effective = excludeConnectionId ? connections.filter((connection) => connection.id !== excludeConnectionId) : connections
  const connected = new Set(effective.filter((connection) => direction === 'outbound' ? connection.sourceNodeId === nodeId : connection.targetNodeId === nodeId).map((connection) => direction === 'outbound' ? connection.targetNodeId : connection.sourceNodeId))
  const cyclic = projectType === 'general' ? collectReachable(effective, nodeId, direction === 'outbound' ? 'backward' : 'forward') : new Set<string>()
  return nodes.filter((node) => node.id !== nodeId && !connected.has(node.id) && !cyclic.has(node.id))
}
