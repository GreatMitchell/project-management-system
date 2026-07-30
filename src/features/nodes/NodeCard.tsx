import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, CircleHelp, Edit3, Flag, FlaskConical, Lightbulb, RotateCcw, Target, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { statusLabels, statusStyles } from '../../domain/rules'
import type { Milestone, PraxisNode } from '../../domain/types'

const typeMeta = {
  question: { label: '问题', icon: CircleHelp, tone: 'bg-sky-500/15 text-sky-300' },
  solution: { label: '方案', icon: Lightbulb, tone: 'bg-amber-500/15 text-amber-300' },
  result: { label: '结果', icon: Target, tone: 'bg-emerald-500/15 text-emerald-300' },
}
const validationMeta = {
  passed: { label: '已通过', tone: 'text-emerald-300 bg-emerald-500/12' },
  partial: { label: '部分通过', tone: 'text-amber-300 bg-amber-500/12' },
  failed: { label: '未通过', tone: 'text-rose-300 bg-rose-500/12' },
}

interface Props { node: PraxisNode; milestone?: Milestone; first: boolean; last: boolean; onEdit: () => void; onDelete: () => void; onMove: (direction: -1 | 1) => void; onMilestone: () => void; onNewSolution: () => void }
export function NodeCard({ node, milestone, first, last, onEdit, onDelete, onMove, onMilestone, onNewSolution }: Props) {
  const [logOpen, setLogOpen] = useState(false)
  const Meta = typeMeta[node.type]
  const nodeCode = `${node.type === 'question' ? 'Q' : node.type === 'solution' ? 'S' : 'R'}-${(node.position + 1).toString().padStart(2, '0')}`
  return <article className={`node-card node-card-${node.type} surface-card node-surface relative p-5 pl-16 sm:p-6 sm:pl-20`}><span className={`node-marker absolute left-3.5 top-6 z-10 grid h-10 w-10 place-items-center rounded-full ${Meta.tone}`}><Meta.icon size={19} /></span><div className="relative z-[1] flex flex-wrap items-start justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="tech-module-label" aria-hidden="true">{nodeCode}</span><span className="text-xs font-semibold uppercase tracking-widest text-text-secondary">{Meta.label}</span><span className={`status-badge ${statusStyles[node.status]}`}>{statusLabels[node.status]}</span>{milestone && <button onClick={onMilestone} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${milestone.result ? validationMeta[milestone.result].tone : 'bg-violet-500/12 text-violet-300'}`}><Flag size={12} />{milestone.result ? validationMeta[milestone.result].label : '待验证'}</button>}</div><div className="flex gap-1"><button className="icon-button" disabled={first} onClick={() => onMove(-1)} title="上移"><ArrowUp size={15} /></button><button className="icon-button" disabled={last} onClick={() => onMove(1)} title="下移"><ArrowDown size={15} /></button><button className="icon-button" onClick={onEdit} title="编辑"><Edit3 size={15} /></button><button className="icon-button" onClick={onDelete} title="删除"><Trash2 size={15} /></button></div></div><p className="relative z-[1] mt-4 whitespace-pre-wrap leading-7 text-text-primary">{node.content}</p>{node.log && <div className="relative z-[1] mt-4"><button className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary" onClick={() => setLogOpen(!logOpen)}>{logOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}成果与感受</button>{logOpen && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-surface2/80 p-4 text-sm leading-6 text-text-secondary">{node.log}</p>}</div>}<div className="relative z-[1] mt-5 flex flex-wrap gap-2 border-t border-line/15 pt-4"><button className="text-xs font-medium text-accent-primary" onClick={onMilestone}>{milestone ? <><FlaskConical className="mr-1 inline" size={13} />查看 / 执行验证</> : <><Flag className="mr-1 inline" size={13} />设为里程碑</>}</button>{milestone && milestone.result && milestone.result !== 'passed' && <button className="ml-auto text-xs font-medium text-text-secondary" onClick={onNewSolution}><RotateCcw className="mr-1 inline" size={13} />添加调整方案</button>}</div></article>
}

export const nodeTypeMeta = typeMeta
export const milestoneResultMeta = validationMeta
