import { LocateFixed, Star } from 'lucide-react'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { db } from '../../db/database'
import { statusLabels, statusStyles, vulnerabilityStatusLabels } from '../../domain/rules'
import { projectStatuses, vulnerabilityStatuses } from '../../domain/types'
import type { NodeStatus, PraxisNode, Project, VulnerabilityStatus } from '../../domain/types'
import { nodeTypeMeta } from '../nodes/NodeCard'
import { markdownToPlainText } from '../nodes/markdown'
import { repository } from '../../repositories/repository'

export interface FocusRow { project: Project; node: PraxisNode }

const closedStatuses = ['completed', 'abandoned']

export function FocusPage() {
  const rows = useLiveQuery(async (): Promise<FocusRow[]> => {
    const projects = await db.projects.toArray()
    const out: FocusRow[] = []
    for (const project of projects) {
      if (!project.focusedNodeIds?.length) continue
      const nodes = await db.nodes.bulkGet(project.focusedNodeIds)
      for (const node of nodes) if (node) out.push({ project, node })
    }
    return out.sort((a, b) => b.node.updatedAt.localeCompare(a.node.updatedAt))
  }, []) ?? []
  const [showClosed, setShowClosed] = useState(false)
  const { notify } = useToast()

  const visibleRows = showClosed ? rows : rows.filter((row) => !closedStatuses.includes(row.project.status))
  const hiddenCount = rows.length - visibleRows.length

  const unmark = async (row: FocusRow) => {
    try {
      await repository.toggleFocusedNode(row.project.id, row.node.id)
      notify('已取消核心')
    } catch (error) {
      notify(error instanceof Error ? error.message : '无法更新核心标记', 'error')
    }
  }

  return (
    <div className="page-wrap">
      <header className="page-header flex flex-col gap-6 border-b border-line/15 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">跨项目聚焦</p>
          <h1 className="page-title">核心任务表</h1>
          <p className="mt-3 max-w-2xl text-text-secondary">各项目中被标记为核心的关键节点汇集于此。可以直接在这里推进它们，也可以跳回所属项目继续。</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <EmptyFocus />
      ) : (
        <section className="surface-card mt-8">
          <div className="relative z-[1] flex flex-wrap items-center justify-between gap-3 border-b border-line/15 px-5 py-4">
            <p className="text-xs text-text-secondary">
              共 {visibleRows.length} 个核心节点{hiddenCount > 0 && ` · 已隐藏 ${hiddenCount} 个来自已完结项目`}
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
              <input type="checkbox" checked={showClosed} onChange={(event) => setShowClosed(event.target.checked)} />
              显示已完结项目的核心
            </label>
          </div>
          {visibleRows.length ? (
            <div className="relative z-[1] overflow-x-auto">
              <table className="focus-table">
                <thead>
                  <tr>
                    <th>项目</th>
                    <th>类型</th>
                    <th className="min-w-72">节点内容</th>
                    <th>状态</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <FocusRowItem key={row.node.id} row={row} onUnmark={() => void unmark(row)} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="relative z-[1] px-5 py-12 text-center text-sm text-text-secondary">已完结项目的核心节点已隐藏，勾选上方选项即可查看。</p>
          )}
        </section>
      )}
    </div>
  )
}

function EmptyFocus() {
  return (
    <section className="surface-ghost mt-16 px-6 py-20 text-center">
      <Star className="mx-auto text-accent-primary" size={42} strokeWidth={1.4} />
      <h2 className="mt-5 font-serif text-2xl text-text-primary">还没有核心节点</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">
        在项目的路线图中选择节点并「设为核心」，它们会汇集到这张表里，成为跨项目的焦点。
      </p>
      <Link className="button-primary mt-6" to="/projects">去项目总览</Link>
    </section>
  )
}

function FocusRowItem({ row, onUnmark }: { row: FocusRow; onUnmark: () => void }) {
  const { project, node } = row
  const { notify } = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.content)
  const [saving, setSaving] = useState(false)
  const Meta = nodeTypeMeta[node.type] ?? nodeTypeMeta.question

  const persist = async (input: { content?: string; status?: NodeStatus; vulnerabilityStatus?: VulnerabilityStatus }) => {
    if (saving) return
    setSaving(true)
    try {
      await repository.saveNode(project.id, { type: node.type, content: input.content ?? node.content, status: input.status !== undefined ? input.status : node.status, vulnerabilityStatus: input.vulnerabilityStatus !== undefined ? input.vulnerabilityStatus : node.vulnerabilityStatus, log: node.log }, node.id)
      if (input.content !== undefined) setEditing(false)
      notify('节点已保存')
    } catch (error) {
      notify(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="focus-table-row">
      <td>
        <div className="flex flex-col items-start gap-1.5">
          <Link className="text-sm font-medium text-accent-primary" to={`/projects/${project.id}?node=${node.id}`}>{project.title}</Link>
          <span className={`status-badge ${statusStyles[project.status]}`}>{statusLabels[project.status]}</span>
        </div>
      </td>
      <td>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${Meta.tone}`}>
          <Meta.icon size={12} />
          {Meta.label}
        </span>
      </td>
      <td>
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea aria-label="节点内容" value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} />
            <div className="flex gap-2">
              <button className="button-primary !px-4 !py-2 text-xs" disabled={saving} onClick={() => void persist({ content: draft })}>保存</button>
              <button className="button-secondary !px-4 !py-2 text-xs" disabled={saving} onClick={() => { setEditing(false); setDraft(node.content) }}>取消</button>
            </div>
          </div>
        ) : (
          <div className="flex max-w-xl flex-col items-start gap-2">
            <p className="text-sm leading-6 text-text-primary">{markdownToPlainText(node.content, 400) || '（空内容）'}</p>
            <button className="text-xs font-medium text-accent-primary" onClick={() => { setEditing(true); setDraft(node.content) }}>编辑内容</button>
          </div>
        )}
      </td>
      <td>
        {node.status ? (
          <select aria-label="节点状态" value={node.status} disabled={saving} onChange={(event) => void persist({ status: event.target.value as NodeStatus })}>
            {projectStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </select>
        ) : node.vulnerabilityStatus ? (
          <select aria-label="缺陷状态" value={node.vulnerabilityStatus} disabled={saving} onChange={(event) => void persist({ vulnerabilityStatus: event.target.value as VulnerabilityStatus })}>
            {vulnerabilityStatuses.map((status) => <option key={status} value={status}>{vulnerabilityStatusLabels[status]}</option>)}
          </select>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
      <td><span className="text-xs text-text-secondary">{new Date(node.updatedAt).toLocaleString('zh-CN')}</span></td>
      <td>
        <div className="flex items-center gap-1">
          <Link className="icon-button" to={`/projects/${project.id}?node=${node.id}`} title="打开项目并定位节点" aria-label={`打开项目：${project.title}`}><LocateFixed size={15} /></Link>
          <button className="icon-button" onClick={onUnmark} title="取消核心" aria-label={`取消核心：${node.id}`}><Star size={15} /></button>
        </div>
      </td>
    </tr>
  )
}
