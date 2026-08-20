import type { EdgeType, NodeStatus, NodeType, PraxisNode, ProjectStatus, ProjectType, VulnerabilityStatus } from './types'

export const statusLabels: Record<ProjectStatus, string> = {
  exploring: '探索中',
  advancing: '推进中',
  paused: '暂停',
  completed: '已完成',
  abandoned: '已弃用',
}

export const statusStyles: Record<ProjectStatus, string> = {
  exploring: 'border-sky-400/30 bg-sky-500/12 text-sky-300',
  advancing: 'border-amber-400/30 bg-amber-500/12 text-amber-300',
  paused: 'border-slate-400/30 bg-slate-500/12 text-slate-300',
  completed: 'border-emerald-400/30 bg-emerald-500/12 text-emerald-300',
  abandoned: 'border-rose-400/30 bg-rose-500/12 text-rose-300',
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

export const nodeTypeLabels: Record<NodeType, string> = {
  question: '问题',
  solution: '方案',
  result: '结果',
  assumption: '假设',
  vulnerability: '缺陷',
}

export const vulnerabilityStatusLabels: Record<VulnerabilityStatus, string> = {
  unexplored: '待探索',
  patched: '已被填',
  open: '待攻克',
  conquered: '已攻克',
}

export const edgeTypeLabels: Record<EdgeType, string> = {
  exposes: '暴露',
  patches: '填补',
  inherits: '继承',
  weakens: '弱化',
}

export const projectTypeLabels: Record<ProjectType, string> = {
  general: '普通项目',
  research: '科研项目',
}

export function calculateResearchProgress(nodes: PraxisNode[]) {
  const vulnerabilities = nodes.filter((node) => node.type === 'vulnerability')
  const open = vulnerabilities.filter((node) => node.vulnerabilityStatus === 'open').length
  const conquered = vulnerabilities.filter((node) => node.vulnerabilityStatus === 'conquered').length
  return { open, conquered, total: vulnerabilities.length }
}
