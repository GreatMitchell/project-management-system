import { ArrowUpRight, CircleDot, Milestone as MilestoneIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { calculateProgress, statusLabels, statusStyles } from '../../domain/rules'
import type { Milestone, PraxisNode, Project } from '../../domain/types'

export function ProjectCard({ project, nodes, milestones }: { project: Project; nodes: PraxisNode[]; milestones: Milestone[] }) {
  const progress = calculateProgress(nodes)
  const passed = milestones.filter((item) => item.result === 'passed').length
  return <Link to={`/projects/${project.id}`} className="group flex min-h-72 flex-col rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-sm transition hover:-translate-y-1 hover:border-moss/40 hover:shadow-soft">
    <div className="flex items-center justify-between"><span className={`status-badge ${statusStyles[project.status]}`}><CircleDot size={12} />{statusLabels[project.status]}</span><ArrowUpRight className="text-moss transition group-hover:translate-x-1 group-hover:-translate-y-1" size={20} /></div>
    <h2 className="mt-7 font-serif text-2xl font-semibold leading-snug text-ink">{project.title}</h2>
    <p className="mt-3 line-clamp-3 text-sm leading-6 text-moss">{project.trigger}</p>
    <div className="mt-auto pt-8"><div className="mb-2 flex justify-between text-xs text-moss"><span>{progress.completed} / {progress.total} 节点完成</span><span>{progress.percent}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-moss transition-all" style={{ width: `${progress.percent}%` }} /></div><div className="mt-4 flex items-center gap-2 text-xs text-moss"><MilestoneIcon size={14} /><span>{passed}/{milestones.length} 个里程碑已验证</span></div></div>
  </Link>
}
