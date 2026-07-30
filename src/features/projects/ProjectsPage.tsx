import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Compass, Plus, Search } from 'lucide-react'
import { db } from '../../db/database'
import type { ProjectInput, ProjectStatus } from '../../domain/types'
import { projectStatuses } from '../../domain/types'
import { statusLabels } from '../../domain/rules'
import { repository } from '../../repositories/repository'
import { ProjectCard } from './ProjectCard'
import { ProjectForm } from './ProjectForm'
import { useToast } from '../../components/Toast'

export function ProjectsPage() {
  const projects = useLiveQuery(() => repository.listProjects(), []) ?? []
  const nodes = useLiveQuery(() => db.nodes.toArray(), []) ?? []
  const milestones = useLiveQuery(() => db.milestones.toArray(), []) ?? []
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const { notify } = useToast()

  const visible = projects.filter(
    (project) =>
      (filter === 'all' || project.status === filter) &&
      `${project.title} ${project.trigger}`.toLowerCase().includes(query.toLowerCase()),
  )

  const create = async (input: ProjectInput) => {
    await repository.createProject(input)
    setFormOpen(false)
    notify('项目已创建，路线从这里开始')
  }

  return (
    <div className="page-wrap">
      <header className="page-header flex flex-col gap-6 border-b border-line/15 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">项目总览</p>
          <h1 className="page-title">从现实出发，沿实践前进</h1>
          <p className="mt-3 max-w-2xl text-text-secondary">这里没有逾期的红色警报。每个项目都由问题、方案与结果连接，并由验证决定下一步。</p>
        </div>
        <button className="button-primary shrink-0" onClick={() => setFormOpen(true)}>
          <Plus size={18} />
          开启新项目
        </button>
      </header>

      <section className="control-bar mt-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <button className={`filter-chip ${filter === 'all' ? 'filter-chip-active' : ''}`} onClick={() => setFilter('all')}>
            全部 <span>{projects.length}</span>
          </button>
          {projectStatuses.map((status) => (
            <button key={status} className={`filter-chip ${filter === status ? 'filter-chip-active' : ''}`} onClick={() => setFilter(status)}>
              {statusLabels[status]} <span>{projects.filter((item) => item.status === status).length}</span>
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目或触发源" aria-label="搜索项目" />
        </label>
      </section>

      {visible.length ? (
        <section className="mt-7 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              nodes={nodes.filter((node) => node.projectId === project.id)}
              milestones={milestones.filter((item) => item.projectId === project.id)}
            />
          ))}
        </section>
      ) : (
        <EmptyState hasProjects={Boolean(projects.length)} onCreate={() => setFormOpen(true)} />
      )}

      <ProjectForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={create} />
    </div>
  )
}

function EmptyState({ hasProjects, onCreate }: { hasProjects: boolean; onCreate: () => void }) {
  return (
    <section className="surface-ghost mt-16 px-6 py-20 text-center">
      <Compass className="mx-auto text-accent-primary" size={42} strokeWidth={1.4} />
      <h2 className="mt-5 font-serif text-2xl text-text-primary">{hasProjects ? '没有符合条件的项目' : '第一条路线尚未开始'}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">
        {hasProjects ? '试试其他状态或搜索词。' : '从一个真实困惑、迫切需求或突然产生的好奇开始。'}
      </p>
      {!hasProjects && (
        <button className="button-primary mt-6" onClick={onCreate}>
          <Plus size={18} />
          创建第一个项目
        </button>
      )}
    </section>
  )
}
