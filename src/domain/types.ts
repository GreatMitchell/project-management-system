import { z } from 'zod'

export const projectStatuses = ['exploring', 'advancing', 'paused', 'completed', 'abandoned'] as const
export const nodeStatuses = projectStatuses
export const nodeTypes = ['question', 'solution', 'result'] as const
export const validationResults = ['passed', 'partial', 'failed'] as const
export const reviewTriggers = ['milestone', 'project_end', 'manual'] as const

export type ProjectStatus = (typeof projectStatuses)[number]
export type NodeStatus = (typeof nodeStatuses)[number]
export type NodeType = (typeof nodeTypes)[number]
export type ValidationResult = (typeof validationResults)[number]
export type ReviewTrigger = (typeof reviewTriggers)[number]

export interface Project {
  id: string
  title: string
  trigger: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

export interface PraxisNode {
  id: string
  projectId: string
  type: NodeType
  content: string
  status: NodeStatus
  log: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface NodeConnection {
  id: string
  projectId: string
  sourceNodeId: string
  targetNodeId: string
  createdAt: string
}

export interface Milestone {
  id: string
  projectId: string
  nodeId: string
  title: string
  method: string
  criteria: string
  result: ValidationResult | null
  feeling: string
  validatedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Review {
  id: string
  projectId: string
  trigger: ReviewTrigger
  health: string
  execution: string
  systemAdjustment: string
  createdAt: string
  updatedAt: string
}

export const projectInputSchema = z.object({
  title: z.string().trim().min(1, '请输入项目名称').max(80, '项目名称不能超过 80 字'),
  trigger: z.string().trim().min(1, '请记录启动项目的现实触发').max(1000, '触发源不能超过 1000 字'),
  status: z.enum(projectStatuses),
})

export const nodeInputSchema = z.object({
  type: z.enum(nodeTypes),
  content: z.string().trim().min(1, '请输入节点内容').max(2000),
  status: z.enum(nodeStatuses),
  log: z.string().max(5000),
})

export const milestoneInputSchema = z.object({
  title: z.string().trim().min(1, '请输入里程碑名称').max(100),
  method: z.string().trim().min(1, '请输入验证方式').max(1000),
  criteria: z.string().trim().min(1, '请输入通过标准').max(1000),
  result: z.enum(validationResults).nullable(),
  feeling: z.string().max(2000),
})

export const reviewInputSchema = z.object({
  trigger: z.enum(reviewTriggers),
  health: z.string().trim().min(1, '请记录项目健康度'),
  execution: z.string().trim().min(1, '请审视最近的执行模式'),
  systemAdjustment: z.string().trim().min(1, '请记录系统是否需要调整'),
})

export type ProjectInput = z.infer<typeof projectInputSchema>
export type NodeInput = z.infer<typeof nodeInputSchema>
export type MilestoneInput = z.infer<typeof milestoneInputSchema>
export type ReviewInput = z.infer<typeof reviewInputSchema>

export interface ProjectBundle {
  project: Project
  nodes: PraxisNode[]
  connections: NodeConnection[]
  milestones: Milestone[]
  reviews: Review[]
}

export interface BackupDataV1 {
  version: 1
  exportedAt: string
  projects: Project[]
  nodes: PraxisNode[]
  milestones: Milestone[]
  reviews: Review[]
}

export interface BackupData {
  version: 2
  exportedAt: string
  projects: Project[]
  nodes: PraxisNode[]
  connections: NodeConnection[]
  milestones: Milestone[]
  reviews: Review[]
}
