import { describe, expect, it } from 'vitest'
import { calculateProgress, calculateResearchProgress, canTransition, nextNodePosition } from './rules'
import { nodeContentMaxLength, nodeInputSchema, nodeLogMaxLength, type PraxisNode } from './types'

const node = (status: PraxisNode['status'], position: number): PraxisNode => ({ id: String(position), projectId: 'p1', type: 'question', content: '内容', status, log: '', position, createdAt: '', updatedAt: '' })
const vulnNode = (vulnerabilityStatus: PraxisNode['vulnerabilityStatus'], position: number): PraxisNode => ({ ...node(null, position), type: 'vulnerability', status: null, vulnerabilityStatus })

describe('领域规则', () => {
  it('不把已弃用节点计入进度分母', () => {
    expect(calculateProgress([node('completed', 0), node('advancing', 1), node('abandoned', 2)])).toEqual({ completed: 1, total: 2, percent: 50 })
  })
  it('空节点链的进度为零', () => { expect(calculateProgress([])).toEqual({ completed: 0, total: 0, percent: 0 }) })
  it('遵守项目状态流转规则', () => { expect(canTransition('exploring', 'advancing')).toBe(true); expect(canTransition('exploring', 'completed')).toBe(false); expect(canTransition('completed', 'advancing')).toBe(true) })
  it('为新节点生成稳定的下一个位置', () => { expect(nextNodePosition([node('advancing', 3), node('completed', 8)])).toBe(9) })
  it('缺陷研究进度只把待攻克与已攻克计入分母', () => {
    const nodes = [vulnNode('open', 0), vulnNode('conquered', 1), vulnNode('unexplored', 2), vulnNode('patched', 3), vulnNode(undefined, 4), node(null, 5)]
    expect(calculateResearchProgress(nodes)).toEqual({ open: 1, conquered: 1, total: 5, counted: 2 })
  })
  it('无缺陷节点时缺陷研究进度为零', () => {
    expect(calculateResearchProgress([node('exploring', 0)])).toEqual({ open: 0, conquered: 0, total: 0, counted: 0 })
  })
  it('允许 Markdown 长内容并拒绝超过新上限的输入', () => { const base = { type: 'question' as const, status: 'exploring' as const, vulnerabilityStatus: 'unexplored' as const }; expect(nodeInputSchema.safeParse({ ...base, content: 'x'.repeat(nodeContentMaxLength), log: 'y'.repeat(nodeLogMaxLength) }).success).toBe(true); expect(nodeInputSchema.safeParse({ ...base, content: 'x'.repeat(nodeContentMaxLength + 1), log: '' }).success).toBe(false); expect(nodeInputSchema.safeParse({ ...base, content: '内容', log: 'y'.repeat(nodeLogMaxLength + 1) }).success).toBe(false) })
})
