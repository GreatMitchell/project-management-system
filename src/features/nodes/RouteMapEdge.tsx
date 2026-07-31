import { BaseEdge, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react'

export type RouteMapEdge = Edge<Record<string, never>, 'routeMap'>

export function RouteMapEdge({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, markerEnd, style }: EdgeProps<RouteMapEdge>) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  return (
    <>
      <path className="game-road-bed" d={path} />
      <BaseEdge path={path} markerEnd={markerEnd} style={style} />
    </>
  )
}
