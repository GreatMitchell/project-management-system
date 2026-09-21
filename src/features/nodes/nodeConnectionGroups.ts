import type { NodeConnection, PraxisNode } from '../../domain/types'

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
