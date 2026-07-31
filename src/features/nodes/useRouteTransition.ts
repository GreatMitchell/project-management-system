import { useEffect, useRef, useState } from 'react'

export function useRouteTransition(activeNodeId: string | null, routeNodeIds: string[], reduceMotion: boolean) {
  const signature = `${activeNodeId ?? ''}|${routeNodeIds.join(',')}`; const previous = useRef(signature); const mounted = useRef(false); const [transitioning, setTransitioning] = useState(false)
  useEffect(() => { if (!mounted.current) { mounted.current = true; previous.current = signature; return } if (previous.current === signature) return; previous.current = signature; if (reduceMotion) { setTransitioning(false); return } setTransitioning(true); const timer = window.setTimeout(() => setTransitioning(false), 850); return () => window.clearTimeout(timer) }, [reduceMotion, signature])
  return transitioning
}

export function useReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => { const query = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReduceMotion(query.matches); query.addEventListener('change', update); return () => query.removeEventListener('change', update) }, [])
  return reduceMotion
}
