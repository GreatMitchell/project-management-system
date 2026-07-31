import { describe, expect, it } from 'vitest'
import type { CurrentRoute } from '../../domain/graph'
import type { PraxisNode } from '../../domain/types'
import { getGraphVisualState } from './graphVisualState'
const node = (id: string, status: PraxisNode['status'] = 'advancing'): PraxisNode => ({ id, projectId: 'p', type: 'question', content: id, status, log: '', position: 0, createdAt: '', updatedAt: '' })
const route = (nodeIds: string[], needsChoiceNodeId: string | null = null): CurrentRoute => ({ nodeIds, connectionIds: [], complete: !needsChoiceNodeId, needsChoiceNodeId, invalid: false })
describe('任务图视觉状态', () => {
  it('当前目标优先显示可执行', () => expect(getGraphVisualState(node('a','paused'),route(['a']),'a')).toMatchObject({ state:'active',label:'当前目标' }))
  it('区分当前路线完成与路线外完成', () => { expect(getGraphVisualState(node('a','completed'),route(['a']),null).state).toBe('unlocked'); expect(getGraphVisualState(node('b','completed'),route(['a']),null).state).toBe('completed') })
  it('区分路线可用与视觉阻塞', () => { expect(getGraphVisualState(node('a'),route(['a']),null).state).toBe('available'); expect(getGraphVisualState(node('b'),route(['a']),null).state).toBe('blocked') })
  it('保留暂停、弃用和待确认语义', () => { expect(getGraphVisualState(node('p','paused'),route([]),null).state).toBe('paused'); expect(getGraphVisualState(node('x','abandoned'),route([]),null).state).toBe('abandoned'); expect(getGraphVisualState(node('c'),route(['c'],'c'),null).needsChoice).toBe(true) })
})
