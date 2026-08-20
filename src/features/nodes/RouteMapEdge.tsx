import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react'
import type { EdgeType } from '../../domain/types'
import { edgeTypeLabels } from '../../domain/rules'

export interface RouteMapEdgeData {
  edgeType?: EdgeType
  projectType?: 'general' | 'research'
}

export type RouteMapEdge = Edge<RouteMapEdgeData, 'routeMap'>

export function RouteMapEdge({ id, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, markerEnd, style, data }: EdgeProps<RouteMapEdge>) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  
  const showLabel = data?.projectType === 'research' && data?.edgeType

  return (
    <>
      <path className="graph-signal-bed" d={path} />
      <path className="game-road-bed" d={path} />
      <BaseEdge path={path} markerEnd={markerEnd} style={style} />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan rounded-md bg-surface/90 px-2 py-0.5 text-[10px] font-medium text-accent-primary shadow-sm backdrop-blur-sm border border-accent-primary/20"
          >
            {edgeTypeLabels[data.edgeType]}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

