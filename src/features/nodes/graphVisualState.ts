import { vulnerabilityStatusLabels } from '../../domain/rules'
import type { CurrentRoute } from '../../domain/graph'
import type { PraxisNode, VulnerabilityStatus } from '../../domain/types'

export type GraphVisualState = 'active' | 'unlocked' | 'available' | 'blocked' | 'completed' | 'abandoned' | 'paused'

export interface GraphVisualPresentation {
  state: GraphVisualState
  label: string
  symbol: 'target' | 'check' | 'route' | 'lock' | 'pause' | 'abandoned'
  needsChoice: boolean
}

const vulnerabilityPresets: Record<VulnerabilityStatus, { state: GraphVisualState; label: string; symbol: GraphVisualPresentation['symbol'] }> = {
  unexplored: { state: 'blocked', label: vulnerabilityStatusLabels.unexplored, symbol: 'lock' },
  patched: { state: 'unlocked', label: vulnerabilityStatusLabels.patched, symbol: 'check' },
  open: { state: 'available', label: vulnerabilityStatusLabels.open, symbol: 'route' },
  conquered: { state: 'completed', label: vulnerabilityStatusLabels.conquered, symbol: 'check' },
}

export function getGraphVisualState(node: PraxisNode, route: CurrentRoute, activeNodeId: string | null): GraphVisualPresentation {
  const onRoute = route.nodeIds.includes(node.id)
  const needsChoice = route.needsChoiceNodeId === node.id
  if (node.id === activeNodeId) return { state: 'active', label: '当前目标', symbol: 'target', needsChoice }
  // 缺陷节点始终展示自身缺陷状态，优先于通用路线样式；缺失状态视同待探索
  if (node.type === 'vulnerability') return { ...vulnerabilityPresets[node.vulnerabilityStatus ?? 'unexplored'], needsChoice }
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
