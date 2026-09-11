import { describe, expect, it } from 'vitest'
import { buildPlainEnvelope, buildShareData, parsePlainEnvelopePayload, shareDataSchema, shareEnvelopeSchema, shareFileName } from './shareData'
import { fullOptions, sampleBundle } from './shareFixtures'

describe('分享数据构建', () => {
  it('完整构建保留里程碑与复盘并剔除悬空引用', () => {
    const data = buildShareData(sampleBundle, fullOptions, '2026-01-03T00:00:00.000Z')
    expect(data.version).toBe(1)
    expect(data.project).toEqual(sampleBundle.project)
    expect(data.nodes).toHaveLength(2)
    expect(data.connections.map((item) => item.id)).toEqual(['c1'])
    expect(data.milestones.map((item) => item.id)).toEqual(['m1'])
    expect(data.reviews.map((item) => item.id)).toEqual(['r1'])
    expect(() => shareDataSchema.parse(data)).not.toThrow()
  })
  it('按勾选清空里程碑与复盘', () => {
    const data = buildShareData(sampleBundle, { includeMilestones: false, includeReviews: false, theme: 'tech' })
    expect(data.milestones).toEqual([])
    expect(data.reviews).toEqual([])
    expect(data.shareOptions).toEqual({ includeMilestones: false, includeReviews: false, theme: 'tech' })
  })
  it('结构校验拒绝坏枚举与缺口令牌', () => {
    const data = buildShareData(sampleBundle, fullOptions)
    expect(() => shareDataSchema.parse({ ...data, project: { ...data.project, status: 'unknown' } })).toThrow()
    expect(() => shareEnvelopeSchema.parse({ format: 'other', version: 1, encrypted: false, payload: 'AAAA' })).toThrow()
    expect(() => shareEnvelopeSchema.parse({ format: 'praxis-share', version: 1, encrypted: true, kdf: 'PBKDF2-SHA256', iterations: 1, salt: 'AAAA', iv: 'AAAA', payload: 'AAAA' })).toThrow()
  })
  it('明文信封 base64 往返', () => {
    const data = buildShareData(sampleBundle, fullOptions)
    const envelope = buildPlainEnvelope(data)
    expect(envelope.encrypted).toBe(false)
    expect(shareDataSchema.parse(parsePlainEnvelopePayload(envelope.payload))).toEqual(data)
  })
})

describe('分享文件名', () => {
  it('明文使用标题 slug 与日期', () => {
    expect(shareFileName('My Cool Project', '2026-01-03T00:00:00.000Z', false)).toBe('praxis-share-my-cool-project-20260103.html')
  })
  it('中文标题回退 project，加密时不泄露标题', () => {
    expect(shareFileName('中文项目', '2026-01-03T00:00:00.000Z', false)).toBe('praxis-share-project-20260103.html')
    expect(shareFileName('My Cool Project', '2026-01-03T00:00:00.000Z', true)).toBe('praxis-share-20260103.html')
  })
})
