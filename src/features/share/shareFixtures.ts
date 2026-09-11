import type { ProjectBundle } from '../../domain/types'
import { buildShareData, type ShareData, type ShareOptions } from './shareData'

export const sampleBundle: ProjectBundle = {
  project: {
    id: 'p1', title: 'Sample Project', trigger: '现实触发', status: 'advancing', type: 'general', activeNodeId: 'n2',
    focusedNodeIds: [], coreNodeIds: ['n1'], pinnedAt: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
  },
  nodes: [
    { id: 'n1', projectId: 'p1', type: 'question', content: '第一个问题', status: 'completed', log: '已回答', position: 0, graphPosition: { x: 40, y: 80 }, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'n2', projectId: 'p1', type: 'solution', content: '推进方案', status: 'advancing', log: '', position: 1, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' },
  ],
  connections: [
    { id: 'c1', projectId: 'p1', sourceNodeId: 'n1', targetNodeId: 'n2', isPreferred: true, createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'c2', projectId: 'p1', sourceNodeId: 'n1', targetNodeId: 'ghost', isPreferred: false, createdAt: '2026-01-01T00:00:00.000Z' },
  ],
  milestones: [
    { id: 'm1', projectId: 'p1', nodeId: 'n1', title: '里程碑', method: '验证方式', criteria: '通过标准', result: 'passed', feeling: '感觉不错', validatedAt: '2026-01-02T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' },
    { id: 'm2', projectId: 'p1', nodeId: 'ghost', title: '悬空里程碑', method: '', criteria: '', result: null, feeling: '', validatedAt: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  ],
  reviews: [
    { id: 'r1', projectId: 'p1', trigger: 'manual', health: '健康', execution: '执行', systemAdjustment: '调整', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' },
  ],
}

export const fullOptions: ShareOptions = { includeMilestones: true, includeReviews: true, theme: 'calm' }

export function sampleShareData(): ShareData {
  return buildShareData(sampleBundle, fullOptions, '2026-01-03T00:00:00.000Z')
}
