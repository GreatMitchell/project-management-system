import { describe, expect, it } from 'vitest'
import { decryptShareData, encryptShareData, SHARE_DECRYPT_FAILED } from './crypto'
import { buildPlainEnvelope, shareDataSchema } from './shareData'
import { sampleShareData } from './shareFixtures'

describe('分享加密', () => {
  it('加密往返还原数据', async () => {
    const data = sampleShareData()
    const envelope = await encryptShareData(data, '正确的口令 123')
    expect(envelope.encrypted).toBe(true)
    if (envelope.encrypted) expect(envelope.iterations).toBeGreaterThan(60_000)
    expect(shareDataSchema.parse(await decryptShareData(envelope, '正确的口令 123'))).toEqual(data)
  })
  it('unicode 与特殊字符载荷往返', async () => {
    const data = sampleShareData()
    data.project.title = '🚀 项目 "引号" <tag> 反斜杠\\'
    data.nodes[0].content = '```js\nconst x = "</script>";\n```'
    const envelope = await encryptShareData(data, 'p@ss')
    expect(shareDataSchema.parse(await decryptShareData(envelope, 'p@ss'))).toEqual(data)
  })
  it('错误口令与篡改密文都报告解密失败', async () => {
    const envelope = await encryptShareData(sampleShareData(), '口令')
    await expect(decryptShareData(envelope, '错误口令')).rejects.toThrow(SHARE_DECRYPT_FAILED)
    const tampered = { ...envelope, payload: 'AAAA' + envelope.payload.slice(4) }
    await expect(decryptShareData(tampered, '口令')).rejects.toThrow(SHARE_DECRYPT_FAILED)
  })
  it('明文信封不加密直接解出', async () => {
    const data = sampleShareData()
    expect(shareDataSchema.parse(await decryptShareData(buildPlainEnvelope(data), ''))).toEqual(data)
  })
})
