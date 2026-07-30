import { ClipboardCheck, Edit3, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { db } from '../../db/database'
import type { Review, ReviewInput } from '../../domain/types'
import { repository } from '../../repositories/repository'
import { ReviewForm } from './ReviewForm'

const triggerLabels = { milestone: '里程碑验证', project_end: '项目结束', manual: '主动审视' }
export function ReviewsPage() {
  const reviews = useLiveQuery(() => db.reviews.orderBy('createdAt').reverse().toArray(), []) ?? []
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const [editing, setEditing] = useState<Review | null>(null); const [deleting, setDeleting] = useState<Review | null>(null); const { notify } = useToast()
  const save = async (input: ReviewInput) => { if (!editing) return; await repository.saveReview(editing.projectId, input, editing.id); setEditing(null); notify('审视记录已更新') }
  const remove = async () => { if (!deleting) return; await repository.deleteReview(deleting.id); setDeleting(null); notify('审视记录已删除', 'info') }
  return <div className="page-wrap"><header className="border-b border-line/15 pb-8"><p className="eyebrow">跨项目反馈</p><h1 className="page-title">审视记录</h1><p className="mt-3 max-w-2xl text-text-secondary">回看实践如何改变认识。新审视从具体项目发起，避免脱离现实语境。</p></header>
    {reviews.length ? <div className="mt-8 grid gap-5 xl:grid-cols-2">{reviews.map((review) => { const project = projects.find((item) => item.id === review.projectId); return <article key={review.id} className="surface-card p-6"><div className="flex items-start justify-between gap-4"><div><span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent-primary">{triggerLabels[review.trigger]}</span><h2 className="mt-3 font-serif text-xl text-text-primary">{project?.title ?? '已删除项目'}</h2><p className="mt-1 text-xs text-text-secondary">{new Date(review.createdAt).toLocaleString('zh-CN')}</p></div><div className="flex gap-1"><button className="icon-button" onClick={() => setEditing(review)} title="编辑"><Edit3 size={15} /></button><button className="icon-button" onClick={() => setDeleting(review)} title="删除"><Trash2 size={15} /></button></div></div><dl className="mt-6 space-y-4 text-sm"><div><dt className="font-medium text-text-primary">项目健康度</dt><dd className="mt-1 whitespace-pre-wrap leading-6 text-text-secondary">{review.health}</dd></div><div><dt className="font-medium text-text-primary">执行模式</dt><dd className="mt-1 whitespace-pre-wrap leading-6 text-text-secondary">{review.execution}</dd></div><div><dt className="font-medium text-text-primary">系统调整</dt><dd className="mt-1 whitespace-pre-wrap leading-6 text-text-secondary">{review.systemAdjustment}</dd></div></dl>{project && <Link className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-accent-primary" to={`/projects/${project.id}`}>回到项目现场 <ExternalLink size={13} /></Link>}</article> })}</div> : <section className="surface-ghost mt-14 py-20 text-center"><ClipboardCheck className="mx-auto text-accent-primary" size={40} /><h2 className="mt-4 font-serif text-2xl text-text-primary">还没有审视记录</h2><p className="mt-2 text-sm text-text-secondary">进入一个项目，在里程碑验证后或任何需要修正路线的时候发起审视。</p><Link to="/projects" className="button-primary mt-6"><Plus size={17} />选择一个项目</Link></section>}
    <ReviewForm open={Boolean(editing)} review={editing} onClose={() => setEditing(null)} onSubmit={save} /><ConfirmDialog open={Boolean(deleting)} title="删除这条审视？" message="删除后无法恢复，但不会影响项目及节点数据。" danger confirmLabel="确认删除" onClose={() => setDeleting(null)} onConfirm={remove} />
  </div>
}
