import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, CircleHelp, Edit3, Flag, FlaskConical, Lightbulb, RotateCcw, Target, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { statusLabels, statusStyles } from '../../domain/rules'
import type { Milestone, PraxisNode } from '../../domain/types'

const typeMeta = {
  question: { label: '问题', icon: CircleHelp, tone: 'bg-sky-100 text-sky-800' },
  solution: { label: '方案', icon: Lightbulb, tone: 'bg-amber-100 text-amber-800' },
  result: { label: '结果', icon: Target, tone: 'bg-emerald-100 text-emerald-800' },
}
const validationMeta = {
  passed: { label: '已通过', tone: 'text-emerald-700 bg-emerald-50' },
  partial: { label: '部分通过', tone: 'text-amber-700 bg-amber-50' },
  failed: { label: '未通过', tone: 'text-rose-700 bg-rose-50' },
}

interface Props { node: PraxisNode; milestone?: Milestone; first: boolean; last: boolean; onEdit: () => void; onDelete: () => void; onMove: (direction: -1 | 1) => void; onMilestone: () => void; onNewSolution: () => void }
export function NodeCard({ node, milestone, first, last, onEdit, onDelete, onMove, onMilestone, onNewSolution }: Props) {
  const [logOpen, setLogOpen] = useState(false)
  const Meta = typeMeta[node.type]
  return <article className="relative rounded-3xl border border-ink/10 bg-white/85 p-5 pl-16 shadow-sm sm:p-6 sm:pl-20">
    <span className={`absolute left-3.5 top-6 z-10 grid h-10 w-10 place-items-center rounded-full ${Meta.tone}`}><Meta.icon size={19} /></span>
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-widest text-moss">{Meta.label}</span><span className={`status-badge ${statusStyles[node.status]}`}>{statusLabels[node.status]}</span>{milestone && <button onClick={onMilestone} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${milestone.result ? validationMeta[milestone.result].tone : 'bg-violet-50 text-violet-700'}`}><Flag size={12} />{milestone.result ? validationMeta[milestone.result].label : '待验证'}</button>}</div><div className="flex gap-1"><button className="icon-button" disabled={first} onClick={() => onMove(-1)} title="上移"><ArrowUp size={15} /></button><button className="icon-button" disabled={last} onClick={() => onMove(1)} title="下移"><ArrowDown size={15} /></button><button className="icon-button" onClick={onEdit} title="编辑"><Edit3 size={15} /></button><button className="icon-button" onClick={onDelete} title="删除"><Trash2 size={15} /></button></div></div>
    <p className="mt-4 whitespace-pre-wrap leading-7 text-ink">{node.content}</p>
    {node.log && <div className="mt-4"><button className="inline-flex items-center gap-1 text-xs font-medium text-moss" onClick={() => setLogOpen(!logOpen)}>{logOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}成果与感受</button>{logOpen && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-paper p-4 text-sm leading-6 text-moss">{node.log}</p>}</div>}
    <div className="mt-5 flex flex-wrap gap-2 border-t border-ink/10 pt-4"><button className="text-xs font-medium text-clay" onClick={onMilestone}>{milestone ? <><FlaskConical className="mr-1 inline" size={13} />查看 / 执行验证</> : <><Flag className="mr-1 inline" size={13} />设为里程碑</>}</button>{milestone && milestone.result && milestone.result !== 'passed' && <button className="ml-auto text-xs font-medium text-moss" onClick={onNewSolution}><RotateCcw className="mr-1 inline" size={13} />添加调整方案</button>}</div>
  </article>
}

export const nodeTypeMeta = typeMeta
export const milestoneResultMeta = validationMeta
