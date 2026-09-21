import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { nodeTypeLabels, statusLabels, statusStyles, vulnerabilityStatusLabels, vulnerabilityStatusStyles } from '../../domain/rules'
import type { NodeType, PraxisNode, ProjectType } from '../../domain/types'
import { markdownToPlainText } from './markdown'
import { filterNodesForSearch, searchStatusKey, searchStatusOptions, searchTypeOptions, type StatusFilterValue } from './nodeSearchFilter'

interface Props { open: boolean; nodes: PraxisNode[]; projectType: ProjectType; onClose: () => void; onSelect: (node: PraxisNode) => void; title?: string; description?: string }

function toggledFilter<T>(current: ReadonlySet<T>, value: T): Set<T> { const next = new Set(current); if (next.has(value)) next.delete(value); else next.add(value); return next }

export function NodeSearchDialog({ open, nodes, projectType, onClose, onSelect, title, description }: Props) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<Set<NodeType>>(new Set())
  const [statusFilter, setStatusFilter] = useState<Set<StatusFilterValue>>(new Set())
  useEffect(() => { if (open) setQuery('') }, [open])
  useEffect(() => { setTypeFilter(new Set()); setStatusFilter(new Set()) }, [projectType])
  const results = useMemo(() => filterNodesForSearch(nodes, query, typeFilter, statusFilter), [nodes, query, statusFilter, typeFilter])
  const countByType = useMemo(() => { const counts = new Map<NodeType, number>(); for (const node of nodes) counts.set(node.type, (counts.get(node.type) ?? 0) + 1); return counts }, [nodes])
  const countByStatus = useMemo(() => { const counts = new Map<StatusFilterValue, number>(); for (const node of nodes) { const key = searchStatusKey(node); counts.set(key, (counts.get(key) ?? 0) + 1) } return counts }, [nodes])

  return (
    <Modal open={open} title={title ?? '搜索节点'} description={description ?? '输入关键字，或按类型与状态筛选，点击卡片跳转到该节点'} onClose={onClose} width="max-w-xl">
      <label className="search-box w-full">
        <Search size={17} />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索节点内容或附加日志" aria-label="搜索节点" />
      </label>
      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-text-secondary">类型</span>
          {searchTypeOptions(projectType).map((type) => <button key={type} className={`filter-chip !px-3 !py-1.5${typeFilter.has(type) ? ' filter-chip-active' : ''}`} aria-pressed={typeFilter.has(type)} onClick={() => setTypeFilter((current) => toggledFilter(current, type))}>{nodeTypeLabels[type]}<span>{countByType.get(type) ?? 0}</span></button>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-text-secondary">状态</span>
          {searchStatusOptions(projectType).map((option) => <button key={option.value} className={`filter-chip !px-3 !py-1.5${statusFilter.has(option.value) ? ' filter-chip-active' : ''}`} aria-pressed={statusFilter.has(option.value)} onClick={() => setStatusFilter((current) => toggledFilter(current, option.value))}>{option.label}<span>{countByStatus.get(option.value) ?? 0}</span></button>)}
        </div>
      </div>
      <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
        {results.map((node) => {
          const codePrefix = node.type === 'question' ? 'Q' : node.type === 'solution' ? 'S' : node.type === 'result' ? 'R' : node.type === 'assumption' ? 'A' : 'V'
          const vulnStatus = node.type === 'vulnerability' ? node.vulnerabilityStatus ?? 'unexplored' : null
          return (
            <button
              key={node.id}
              className="w-full rounded-2xl border border-line/15 bg-surface p-4 text-left transition hover:border-accent-primary/60 hover:bg-surface2"
              onClick={() => onSelect(node)}
            >
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="tech-module-label" aria-hidden="true">{codePrefix} / {(node.position + 1).toString().padStart(2, '0')}</span>
                <span className="font-semibold uppercase tracking-widest">{nodeTypeLabels[node.type]}</span>
                {node.status ? <span className={`status-badge ${statusStyles[node.status]}`}>{statusLabels[node.status]}</span> : vulnStatus ? <span className={`status-badge ${vulnerabilityStatusStyles[vulnStatus]}`}>{vulnerabilityStatusLabels[vulnStatus]}</span> : <span className="status-badge border-violet-400/30 bg-violet-500/12 text-violet-300">科研条件</span>}
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-text-primary">{markdownToPlainText(node.content, 200) || '（空内容）'}</p>
            </button>
          )
        })}
        {!results.length && <p className="py-8 text-center text-sm text-text-secondary">没有匹配的节点。</p>}
      </div>
    </Modal>
  )
}
