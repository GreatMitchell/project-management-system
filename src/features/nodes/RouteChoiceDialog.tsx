import { ArrowLeft, Check, GitMerge } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { getIncomingConnections } from '../../domain/graph'
import type { NodeConnection, PraxisNode } from '../../domain/types'

interface Props { open: boolean; target: PraxisNode | null; nodes: PraxisNode[]; connections: NodeConnection[]; onClose: () => void; onConfirm: (targetId: string, preferredIds: string[]) => Promise<void> }

export function RouteChoiceDialog({ open, target, nodes, connections, onClose, onConfirm }: Props) {
  const [currentId, setCurrentId] = useState<string | null>(null); const [chosen, setChosen] = useState<Record<string, string>>({}); const [history, setHistory] = useState<string[]>([]); const [saving, setSaving] = useState(false)
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  useEffect(() => { if (open && target) { setCurrentId(target.id); setChosen({}); setHistory([]) } }, [open, target])
  const current = currentId ? nodeById.get(currentId) : undefined; const incoming = current ? getIncomingConnections(current.id, connections) : []
  useEffect(() => { if (!open || !currentId) return; let cursor = currentId; const visited = new Set<string>(); while (!visited.has(cursor)) { visited.add(cursor); const edges = getIncomingConnections(cursor, connections); if (edges.length !== 1) break; setHistory((items) => items.includes(cursor) ? items : [...items, cursor]); cursor = edges[0].sourceNodeId; setCurrentId(cursor) } }, [connections, currentId, open])
  const done = Boolean(current && incoming.length === 0)
  const choose = (edge: NodeConnection) => { setChosen((items) => ({ ...items, [edge.targetNodeId]: edge.id })); setHistory((items) => [...items, edge.targetNodeId]); setCurrentId(edge.sourceNodeId) }
  const back = () => { const previous = history.at(-1); if (!previous) return; setHistory((items) => items.slice(0, -1)); setChosen((items) => { const next = { ...items }; delete next[previous]; return next }); setCurrentId(previous) }
  const submit = async () => { if (!target) return; setSaving(true); try { await onConfirm(target.id, Object.values(chosen)) } finally { setSaving(false) } }

  return <Modal open={open} title="选择当前路线" description={target ? `从“${target.content.slice(0, 36)}”向上确认路线` : undefined} onClose={onClose} width="max-w-2xl">
    {current && <><div className="rounded-2xl border border-line/15 bg-surface2/60 p-4"><p className="text-xs text-text-secondary">正在确认的节点</p><p className="mt-2 font-medium text-text-primary">{current.content}</p></div>
      {incoming.length > 1 && <div className="mt-5"><div className="flex items-center gap-2 text-sm font-semibold text-text-primary"><GitMerge size={17} className="text-accent-primary" />选择从哪一个前驱来到这里</div><div className="mt-3 grid gap-3 sm:grid-cols-2">{incoming.map((edge) => { const source = nodeById.get(edge.sourceNodeId); return <button key={edge.id} className={`rounded-2xl border p-4 text-left transition hover:border-accent-primary/60 hover:bg-surface2 ${edge.isPreferred ? 'border-accent-primary/40 bg-accent-soft/40' : 'border-line/15 bg-surface'}`} onClick={() => choose(edge)}><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-accent-primary">前驱节点</span>{edge.isPreferred && <span className="text-[10px] text-text-secondary">上次选择</span>}</div><p className="mt-2 line-clamp-3 text-sm leading-6 text-text-primary">{source?.content ?? '节点不存在'}</p></button>})}</div></div>}
      {done && <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5"><div className="flex items-center gap-2 font-medium text-text-primary"><Check size={18} className="text-emerald-400" />路线已完整回溯到起点</div><p className="mt-2 text-sm text-text-secondary">确认后将更新当前目标和沿途汇合节点的首选前驱。</p></div>}
      <div className="mt-6 flex justify-between"><button className="button-secondary" disabled={!history.length} onClick={back}><ArrowLeft size={15} />返回上一步</button><div className="flex gap-3"><button className="button-secondary" onClick={onClose}>取消</button><button className="button-primary" disabled={!done || saving} onClick={submit}>确认当前路线</button></div></div></>}
  </Modal>
}
