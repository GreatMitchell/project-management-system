import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react'
import type { EdgeType } from '../../domain/types'
import { edgeTypeLabels } from '../../domain/rules'

export interface RouteMapEdgeData extends Record<string, unknown> {
  edgeType?: EdgeType
  projectType?: 'general' | 'research'
  onEdit?: (connectionId: string) => void
}

export type RouteMapEdge = Edge<RouteMapEdgeData, 'routeMap'>

function createReturnPath(sourceX: number, sourceY: number, targetX: number, targetY: number): [string, number, number] {
  const lift = Math.max(sourceY, targetY) - 150
  const horizontalOffset = 54
  const sourceBendX = sourceX + horizontalOffset
  const targetBendX = targetX - horizontalOffset
  const path = `M ${sourceX},${sourceY} C ${sourceBendX},${sourceY} ${sourceBendX},${lift} ${(sourceX + targetX) / 2},${lift} C ${targetBendX},${lift} ${targetBendX},${targetY} ${targetX},${targetY}`
  return [path, (sourceX + targetX) / 2, lift]
}

export function RouteMapEdge({ id, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, markerEnd, style, data }: EdgeProps<RouteMapEdge>) {
  const isBackEdge = sourceX > targetX + 24
  const pathResult = isBackEdge
    ? createReturnPath(sourceX, sourceY, targetX, targetY)
    : getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const [path, labelX, labelY] = pathResult
  
  const edgeLabel = data?.edgeType ? edgeTypeLabels[data.edgeType] : null

  return (
    <>
      <path className="graph-signal-bed" d={path} />
      <path className="game-road-bed" d={path} />
      <BaseEdge path={path} markerEnd={markerEnd} style={style} />
      {data?.projectType === 'research' && edgeLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            onDoubleClick={() => data?.onEdit?.(id)}
            className="nodrag nopan rounded-md bg-surface/90 px-2 py-0.5 text-[10px] font-medium text-accent-primary shadow-sm backdrop-blur-sm border border-accent-primary/20"
          >
            {edgeLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

