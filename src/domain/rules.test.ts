import { describe, expect, it } from 'vitest'
import { calculateProgress, canTransition, nextNodePosition } from './rules'
import type { PraxisNode } from './types'

const node = (status: PraxisNode['status'], position: number): PraxisNode => ({ id: String(position), projectId: 'p1', type: 'question', content: '内容', status, log: '', position, createdAt: '', updatedAt: '' })

describe('领域规则', () => {
  it('不把已弃用节点计入进度分母', () => {
    expect(calculateProgress([node('completed', 0), node('advancing', 1), node('abandoned', 2)])).toEqual({ completed: 1, total: 2, percent: 50 })
  })
  it('空节点链的进度为零', () => { expect(calculateProgress([])).toEqual({ completed: 0, total: 0, percent: 0 }) })
  it('遵守项目状态流转规则', () => { expect(canTransition('exploring', 'advancing')).toBe(true); expect(canTransition('exploring', 'completed')).toBe(false); expect(canTransition('completed', 'advancing')).toBe(true) })
  it('为新节点生成稳定的下一个位置', () => { expect(nextNodePosition([node('advancing', 3), node('completed', 8)])).toBe(9) })
})
