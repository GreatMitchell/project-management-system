import { nodeStatusLabels, vulnerabilityStatusLabels } from '../../domain/rules'
import { nodeTypes, vulnerabilityStatuses, type NodeStatus, type NodeType, type PraxisNode, type ProjectType, type VulnerabilityStatus } from '../../domain/types'

export type StatusFilterValue = NodeStatus | VulnerabilityStatus | 'none'

// 缺陷节点按 vulnerabilityStatus 归类（缺失视同待探索，与编辑表单一致）；只有其余节点按生命周期 status 归类，缺失才是无状态
export function searchStatusKey(node: PraxisNode): StatusFilterValue {
  if (node.type === 'vulnerability') return node.vulnerabilityStatus ?? 'unexplored'
  return node.status ?? 'none'
}

export function filterNodesForSearch(nodes: readonly PraxisNode[], query: string, typeFilter: ReadonlySet<NodeType>, statusFilter: ReadonlySet<StatusFilterValue>): PraxisNode[] {
  const keyword = query.trim().toLowerCase()
  return nodes.filter((node) => {
    if (keyword && !node.content.toLowerCase().includes(keyword) && !node.log.toLowerCase().includes(keyword)) return false
    if (typeFilter.size && !typeFilter.has(node.type)) return false
    if (statusFilter.size && !statusFilter.has(searchStatusKey(node))) return false
    return true
  })
}

export function searchTypeOptions(projectType: ProjectType): NodeType[] {
  return projectType === 'research' ? [...nodeTypes] : nodeTypes.filter((type) => type === 'question' || type === 'solution' || type === 'result')
}

export function searchStatusOptions(projectType: ProjectType): { value: StatusFilterValue; label: string }[] {
  const options = (Object.entries(nodeStatusLabels) as [NodeStatus, string][]).map(([value, label]) => ({ value, label }))
  if (projectType !== 'research') return options
  const vulnerabilityOptions = vulnerabilityStatuses.map((value) => ({ value, label: vulnerabilityStatusLabels[value] }))
  return [...options, ...vulnerabilityOptions, { value: 'none', label: '无状态' }]
}
