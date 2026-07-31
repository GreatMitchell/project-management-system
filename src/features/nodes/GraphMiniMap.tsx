import { Map as MapIcon, MapPinned, X } from 'lucide-react'
import { MiniMap, type Node } from '@xyflow/react'
import { useEffect, useState } from 'react'
import type { Milestone, PraxisNode } from '../../domain/types'
import type { GraphVisualPresentation } from './graphVisualState'

interface Props { activeNodeId: string | null; routeNodeIds: Set<string>; milestones: Milestone[]; domainNodes: PraxisNode[]; visualById: Map<string, GraphVisualPresentation>; collapsedIds: Set<string> }
export function GraphMiniMap({ activeNodeId, routeNodeIds, milestones, domainNodes, visualById, collapsedIds }: Props) {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 768)
  useEffect(() => { const query = window.matchMedia('(max-width: 767px)'); const update = () => { if (query.matches) setOpen(false) }; query.addEventListener('change', update); return () => query.removeEventListener('change', update) }, [])
  const milestoneIds = new Set(milestones.map((item) => item.nodeId)); const nodeById = new globalThis.Map(domainNodes.map((node) => [node.id, node]))
  const color = (node: Node) => { if (node.id.startsWith('branch-summary:') || collapsedIds.has(node.id)) return 'rgb(var(--text-muted))'; if (node.id === activeNodeId) return 'rgb(var(--graph-active-color))'; if (milestoneIds.has(node.id)) return 'rgb(var(--graph-milestone-color))'; const visual = visualById.get(node.id); if (visual?.state === 'unlocked' || visual?.state === 'completed' || nodeById.get(node.id)?.status === 'completed') return 'rgb(var(--graph-complete-color))'; if (routeNodeIds.has(node.id)) return 'rgb(var(--graph-route-color))'; return 'rgb(var(--graph-blocked-color))' }
  if (!open) return <button className="graph-minimap-toggle" aria-label="展开路线导航图" title="展开路线导航图" onClick={() => setOpen(true)}><MapIcon size={17} /></button>
  return <div className="graph-minimap-panel" aria-label="路线导航图"><div className="graph-minimap-title"><span><MapPinned size={14} /><span className="theme-label-default">路线导航</span><span className="game-only">Route Atlas</span></span><button aria-label="收起路线导航图" title="收起路线导航图" onClick={() => setOpen(false)}><X size={14} /></button></div><MiniMap pannable zoomable nodeColor={color} maskColor="rgb(var(--bg-overlay) / 0.48)" /><div className="graph-minimap-legend" aria-label="路线图图例"><span><i className="legend-active" />目标</span><span><i className="legend-route" />路线</span><span><i className="legend-milestone" />里程碑</span></div></div>
}
