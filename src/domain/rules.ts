import type { NodeStatus, PraxisNode, ProjectStatus } from './types'

export const statusLabels: Record<ProjectStatus, string> = {
  exploring: '探索中',
  advancing: '推进中',
  paused: '暂停',
  completed: '已完成',
  abandoned: '已弃用',
}

export const statusStyles: Record<ProjectStatus, string> = {
  exploring: 'bg-sky-50 text-sky-700 border-sky-200',
  advancing: 'bg-amber-50 text-amber-700 border-amber-200',
  paused: 'bg-stone-100 text-stone-600 border-stone-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  abandoned: 'bg-rose-50 text-rose-700 border-rose-200',
}

export const allowedProjectTransitions: Record<ProjectStatus, ProjectStatus[]> = {
  exploring: ['advancing', 'paused', 'abandoned'],
  advancing: ['exploring', 'paused', 'completed', 'abandoned'],
  paused: ['exploring', 'advancing', 'completed', 'abandoned'],
  completed: ['advancing'],
  abandoned: ['exploring'],
}

export function canTransition(from: ProjectStatus, to: ProjectStatus) {
  return from === to || allowedProjectTransitions[from].includes(to)
}

export function calculateProgress(nodes: PraxisNode[]) {
  const effective = nodes.filter((node) => node.status !== 'abandoned')
  const completed = effective.filter((node) => node.status === 'completed').length
  return { completed, total: effective.length, percent: effective.length ? Math.round((completed / effective.length) * 100) : 0 }
}

export function nextNodePosition(nodes: PraxisNode[]) {
  return nodes.length ? Math.max(...nodes.map((node) => node.position)) + 1 : 0
}

export const nodeStatusLabels: Record<NodeStatus, string> = statusLabels
