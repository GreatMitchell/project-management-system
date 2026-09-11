import { describe, expect, it } from 'vitest'
import type { ShareEnvelope } from './shareData'
import { buildPlainEnvelope } from './shareData'
import { injectSharePayload, SHARE_PAYLOAD_TOKEN } from './injectSharePayload'
import { sampleShareData } from './shareFixtures'

const template = (count = 1) => {
  const injections = Array.from({ length: count }, () => `window.__PRAXIS_SHARE__ = ${SHARE_PAYLOAD_TOKEN};`).join('\n')
  return `<!doctype html><html><body><div id="root"></div><script>\n${injections}\n</script></body></html>`
}

// 从生成结果里取回 window.__PRAXIS_SHARE__ 的字符串字面量并按 JSON 解析（< 转义在 JSON 中合法）。
const extractInjected = (html: string): ShareEnvelope => {
  const match = html.match(/window\.__PRAXIS_SHARE__ = ("(?:[^"\\]|\\.)*");/)
  if (!match) throw new Error('未找到注入结果')
  return JSON.parse(JSON.parse(match[1])) as ShareEnvelope
}

describe('分享载荷注入', () => {
  it('注入一次并可往返解析', () => {
    const envelope = buildPlainEnvelope(sampleShareData())
    const html = injectSharePayload(template(), envelope)
    expect(extractInjected(html)).toEqual(envelope)
    expect(html).not.toContain(SHARE_PAYLOAD_TOKEN)
  })
  it('载荷含脚本闭合符与特殊字符时不逃出 script 标签', () => {
    const hostile = { format: 'praxis-share', version: 1, encrypted: false, payload: '</script><script>alert(1)</script>' } as unknown as ShareEnvelope
    const html = injectSharePayload(template(), hostile)
    expect((html.match(/<\/script>/g) ?? []).length).toBe(1)
    expect(extractInjected(html)).toEqual(hostile)
  })
  it('缺失或重复 token 时明确报错', () => {
    const envelope = buildPlainEnvelope(sampleShareData())
    expect(() => injectSharePayload('<html></html>', envelope)).toThrow('分享模板无效')
    expect(() => injectSharePayload(template(2), envelope)).toThrow('分享模板无效')
  })
})
