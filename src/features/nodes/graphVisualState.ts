import type { CurrentRoute } from '../../domain/graph'
import type { PraxisNode } from '../../domain/types'

export type GraphVisualState = 'active' | 'unlocked' | 'available' | 'blocked' | 'completed' | 'abandoned' | 'paused'

export interface GraphVisualPresentation {
  state: GraphVisualState
  label: string
  symbol: 'target' | 'check' | 'route' | 'lock' | 'pause' | 'abandoned'
  needsChoice: boolean
}

export function getGraphVisualState(node: PraxisNode, route: CurrentRoute, activeNodeId: string | null): GraphVisualPresentation {
  const onRoute = route.nodeIds.includes(node.id)
  const needsChoice = route.needsChoiceNodeId === node.id
  if (node.id === activeNodeId) return { state: 'active', label: '当前目标', symbol: 'target', needsChoice }
  if (node.status === 'completed') return { state: onRoute ? 'unlocked' : 'completed', label: onRoute ? '已解锁' : '已完成', symbol: 'check', needsChoice }
  if (node.status === 'abandoned') return { state: 'abandoned', label: '已放弃', symbol: 'abandoned', needsChoice }
  if (node.status === 'paused') return { state: 'paused', label: '暂停', symbol: 'pause', needsChoice }
  if (onRoute) return { state: 'available', label: '路线可用', symbol: 'route', needsChoice }
  return { state: 'blocked', label: '未探索', symbol: 'lock', needsChoice }
}

export function getGraphEdgeState(source: PraxisNode | undefined, target: PraxisNode | undefined, routeConnectionIds: Set<string>, connectionId: string) {
  if (routeConnectionIds.has(connectionId)) return source?.status === 'completed' && target?.status === 'completed' ? 'complete' : 'route'
  if (target?.status === 'abandoned') return 'abandoned'
  return 'blocked'
}
