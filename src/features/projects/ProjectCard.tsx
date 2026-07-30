import { ArrowUpRight, CircleDot, Milestone as MilestoneIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { calculateProgress, statusLabels, statusStyles } from '../../domain/rules'
import type { Milestone, PraxisNode, Project } from '../../domain/types'

export function ProjectCard({ project, nodes, milestones }: { project: Project; nodes: PraxisNode[]; milestones: Milestone[] }) {
  const progress = calculateProgress(nodes)
  const passed = milestones.filter((item) => item.result === 'passed').length

  return (
    <Link
      to={`/projects/${project.id}`}
      className="project-card group surface-card flex min-h-72 flex-col p-6 transition duration-300 hover:-translate-y-1 hover:border-lineStrong/45 hover:bg-surface"
    >
      <div className="project-card-header relative z-[1] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="tech-module-label" aria-hidden="true">PROJECT / {project.id.slice(-4).toUpperCase()}</span>
          <span className={`status-badge ${statusStyles[project.status]}`}>
            <CircleDot size={12} />
            {statusLabels[project.status]}
          </span>
        </div>
        <ArrowUpRight className="project-card-link text-text-secondary transition group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-accent-primary" size={20} />
      </div>

      <div className="relative z-[1] mt-7 flex items-start justify-between gap-4">
        <h2 className="font-serif text-2xl font-semibold leading-snug text-text-primary">{project.title}</h2>
        <span className="project-kind rounded-full border border-line/15 bg-surface2/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-primary">
          <span className="theme-label-default">Quest</span><span className="tech-only">Module</span>
        </span>
      </div>
      <p className="relative z-[1] mt-3 line-clamp-3 text-sm leading-6 text-text-secondary">{project.trigger}</p>

      <div className="project-card-metrics relative z-[1] mt-auto pt-8">
        <div className="mb-2 flex justify-between text-xs text-text-secondary">
          <span><span className="tech-only">NODE COMPLETION · </span>{progress.completed} / {progress.total} 节点完成</span>
          <span className="metric-value">{progress.percent}%</span>
        </div>
        <div className="progress-track h-2">
          <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <MilestoneIcon size={14} />
            <span>{passed}/{milestones.length} 个里程碑已验证</span>
          </div>
          <span className="project-reward rounded-full bg-accent-soft px-2 py-1 text-[10px] font-medium text-accent-primary"><span className="theme-label-default">+{progress.completed} EXP</span><span className="tech-only">RESOLVED {progress.completed.toString().padStart(2, '0')}</span></span>
        </div>
      </div>
    </Link>
  )
}
