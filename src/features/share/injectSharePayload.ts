import type { ShareEnvelope } from './shareData'

// viewer.html 中的注入点：window.__PRAXIS_SHARE__ = "__PRAXIS_SHARE_PAYLOAD__";
// 替换目标是带引号的 token，替换值是信封 JSON 的 JS 字符串字面量（二次 stringify 转义）。
// 信封内容只含 base64 与数字，天然不可能逃出 <script> 标签。
export const SHARE_PAYLOAD_TOKEN = '"__PRAXIS_SHARE_PAYLOAD__"'

export function injectSharePayload(templateHtml: string, envelope: ShareEnvelope): string {
  const occurrences = templateHtml.split(SHARE_PAYLOAD_TOKEN).length - 1
  if (occurrences !== 1) throw new Error('分享模板无效或版本过旧，请重新运行 npm run build:share-template 生成分享模板')
  // 信封字段本只含 base64 与数字，< 转义是对非规范信封的纵深防御（< 在 JS 字符串与 JSON 中均合法）。
  const literal = JSON.stringify(JSON.stringify(envelope)).replace(/</g, '\\u003c')
  return templateHtml.replace(SHARE_PAYLOAD_TOKEN, () => literal)
}
