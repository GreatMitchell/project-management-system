import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import css from 'highlight.js/lib/languages/css'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

const highlightLanguages = { bash, c, cpp, css, go, java, javascript, json, markdown, python, rust, sql, typescript, xml, yaml }
const highlightAliases = { bash: ['sh', 'shell'], javascript: ['js', 'jsx'], markdown: ['md'], typescript: ['ts', 'tsx'], xml: ['html'], yaml: ['yml'] }

export function safeMarkdownUrl(url: string) {
  const value = url.trim()
  if (!value || value.startsWith('//')) return ''
  if (!/^[a-z][a-z\d+.-]*:/i.test(value)) return value
  const protocol = value.slice(0, value.indexOf(':')).toLowerCase()
  return protocol === 'http' || protocol === 'https' || protocol === 'mailto' ? value : ''
}

const components: Components = {
  a: ({ href, children, title }) => {
    const external = Boolean(href && /^https?:\/\//i.test(href))
    return <a href={href || undefined} title={title} target={external ? '_blank' : undefined} rel={external ? 'noreferrer noopener' : undefined} onClick={(event) => event.stopPropagation()}>{children}</a>
  },
  img: ({ src, alt, title }) => {
    const label = alt?.trim() || title?.trim() || '未命名图片'
    return src ? <a className="markdown-image-link" href={src} target="_blank" rel="noreferrer noopener" onClick={(event) => event.stopPropagation()}>图片链接：{label}</a> : <span className="markdown-image-link markdown-image-link-invalid">图片链接不可用：{label}</span>
  },
}

interface Props { source: string; className?: string; emptyText?: string }

export function MarkdownContent({ source, className = '', emptyText = '暂无内容' }: Props) {
  if (!source.trim()) return <p className={`markdown-empty ${className}`.trim()}>{emptyText}</p>
  return <div className={`markdown-content ${className}`.trim()}><ReactMarkdown skipHtml urlTransform={safeMarkdownUrl} remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { trust: false, strict: 'warn', throwOnError: false }], [rehypeHighlight, { aliases: highlightAliases, detect: false, languages: highlightLanguages }]]} components={components}>{source}</ReactMarkdown></div>
}
