import { z } from 'zod'
import type { ThemeId } from '../../theme/theme-types'
import { edgeTypes, graphPositionSchema, nodeStatuses, nodeTypes, projectStatuses, projectTypes, reviewTriggers, validationResults, vulnerabilityStatuses, type ProjectBundle } from '../../domain/types'
import { base64ToText, textToBase64 } from './base64'

// 只读快照的数据格式。实体字段与 src/domain/types.ts 的接口逐字段对应：
// 保留 id/projectId/log/graphPosition —— 路线推导依赖 projectId，UUID 低敏感；
// 不施加输入侧的业务长度限制（数据来自本机已验证的库，这里只做结构校验）。
const idSchema = z.string().min(1)
const timestampSchema = z.string().min(1)
const base64Schema = z.string().regex(/^[A-Za-z0-9+/][A-Za-z0-9+/]*={0,2}$/, '无效的 base64 数据')

export const sharedProjectSchema = z.object({
  id: idSchema, title: z.string(), trigger: z.string(), status: z.enum(projectStatuses), type: z.enum(projectTypes),
  activeNodeId: z.string().nullable(), focusedNodeIds: z.array(z.string()), coreNodeIds: z.array(z.string()), pinnedAt: z.string().nullable(),
  createdAt: timestampSchema, updatedAt: timestampSchema,
})

export const sharedNodeSchema = z.object({
  id: idSchema, projectId: idSchema, type: z.enum(nodeTypes), content: z.string(), status: z.enum(nodeStatuses).nullable(),
  vulnerabilityStatus: z.enum(vulnerabilityStatuses).optional(), log: z.string(), position: z.number().int().nonnegative(),
  graphPosition: graphPositionSchema.optional(), createdAt: timestampSchema, updatedAt: timestampSchema,
})

export const sharedConnectionSchema = z.object({
  id: idSchema, projectId: idSchema, sourceNodeId: idSchema, targetNodeId: idSchema,
  edgeType: z.enum(edgeTypes).optional(), isPreferred: z.boolean(), createdAt: timestampSchema,
})

export const sharedMilestoneSchema = z.object({
  id: idSchema, projectId: idSchema, nodeId: idSchema, title: z.string(), method: z.string(), criteria: z.string(),
  result: z.enum(validationResults).nullable(), feeling: z.string(), validatedAt: z.string().nullable(),
  createdAt: timestampSchema, updatedAt: timestampSchema,
})

export const sharedReviewSchema = z.object({
  id: idSchema, projectId: idSchema, trigger: z.enum(reviewTriggers), health: z.string(), execution: z.string(),
  systemAdjustment: z.string(), createdAt: timestampSchema, updatedAt: timestampSchema,
})

const shareThemeIds = ['calm', 'tech', 'game'] as const satisfies readonly ThemeId[]

export const shareOptionsSchema = z.object({ includeMilestones: z.boolean(), includeReviews: z.boolean(), theme: z.enum(shareThemeIds) })

export const shareDataSchema = z.object({
  version: z.literal(1), generator: z.literal('praxis-path'), sharedAt: timestampSchema, shareOptions: shareOptionsSchema,
  project: sharedProjectSchema, nodes: z.array(sharedNodeSchema), connections: z.array(sharedConnectionSchema),
  milestones: z.array(sharedMilestoneSchema).default([]), reviews: z.array(sharedReviewSchema).default([]),
})

export type ShareOptions = z.infer<typeof shareOptionsSchema>
export type ShareData = z.infer<typeof shareDataSchema>

// 嵌入单文件 HTML 的信封：payload 始终是 ShareData JSON 的 base64，明文/密文由 encrypted 区分。
export const shareEnvelopeSchema = z.discriminatedUnion('encrypted', [
  z.object({ format: z.literal('praxis-share'), version: z.literal(1), encrypted: z.literal(false), payload: base64Schema }),
  z.object({
    format: z.literal('praxis-share'), version: z.literal(1), encrypted: z.literal(true), kdf: z.literal('PBKDF2-SHA256'),
    iterations: z.number().int().min(60_000).max(20_000_000), salt: base64Schema, iv: base64Schema, payload: base64Schema,
  }),
])

export type ShareEnvelope = z.infer<typeof shareEnvelopeSchema>

export function buildShareData(bundle: ProjectBundle, options: ShareOptions, sharedAt = new Date().toISOString()): ShareData {
  const nodeIds = new Set(bundle.nodes.map((node) => node.id))
  return shareDataSchema.parse({
    version: 1, generator: 'praxis-path', sharedAt, shareOptions: options,
    project: bundle.project, nodes: bundle.nodes,
    connections: bundle.connections.filter((edge) => nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId)),
    milestones: options.includeMilestones ? bundle.milestones.filter((item) => nodeIds.has(item.nodeId)) : [],
    reviews: options.includeReviews ? bundle.reviews : [],
  })
}

export function buildPlainEnvelope(data: ShareData): ShareEnvelope {
  return { format: 'praxis-share', version: 1, encrypted: false, payload: textToBase64(JSON.stringify(data)) }
}

export function parsePlainEnvelopePayload(payload: string): unknown {
  return JSON.parse(base64ToText(payload))
}

export function shareFileName(title: string, sharedAt: string, encrypted: boolean): string {
  const date = sharedAt.slice(0, 10).replaceAll('-', '')
  if (encrypted) return `praxis-share-${date}.html`
  const slug = title.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'project'
  return `praxis-share-${slug}-${date}.html`
}
