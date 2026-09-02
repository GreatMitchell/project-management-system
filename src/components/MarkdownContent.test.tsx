import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MarkdownContent, safeMarkdownUrl } from './MarkdownContent'

afterEach(cleanup)

describe('MarkdownContent', () => {
  it('渲染 GFM、KaTeX 与指定语言代码高亮', () => {
    const source = ['# 实验结论', '', '- [x] 已验证', '', '| 参数 | 值 |', '| --- | --- |', '| alpha | 1 |', '', '行内公式 $E = mc^2$', '', '$$', '\\frac{1}{2}', '$$', '', '```typescript', 'const value: number = 1', '```'].join('\n')
    const { container } = render(<MarkdownContent source={source} />)
    expect(screen.getByRole('heading', { name: '实验结论' })).toBeVisible()
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByRole('table')).toBeVisible()
    expect(container.querySelector('.katex')).toBeInTheDocument()
    expect(container.querySelector('.katex-display')).toBeInTheDocument()
    expect(container.querySelector('code.hljs.language-typescript')).toBeInTheDocument()
  })

  it('禁用原始 HTML 与危险协议', () => {
    const { container } = render(<MarkdownContent source={'<strong>原始 HTML</strong>\n\n[危险链接](javascript:alert(1))'} />)
    expect(container.querySelector('strong')).not.toBeInTheDocument()
    expect(screen.getByText('原始 HTML')).toBeVisible()
    expect(screen.getByText('危险链接').closest('a')).not.toHaveAttribute('href')
    expect(safeMarkdownUrl('data:text/html,boom')).toBe('')
    expect(safeMarkdownUrl('/projects/one')).toBe('/projects/one')
  })

  it('把外部图片转换为安全链接而不创建图片请求', () => {
    const { container } = render(<MarkdownContent source={'![实验图](https://images.example/plot.png)'} />)
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '图片链接：实验图' })).toHaveAttribute('href', 'https://images.example/plot.png')
    expect(screen.getByRole('link', { name: '图片链接：实验图' })).toHaveAttribute('rel', 'noreferrer noopener')
  })

  it('为外部链接增加安全属性并保留相对链接', () => {
    render(<MarkdownContent source={'[外部](https://example.com) [内部](/projects/one)'} />)
    expect(screen.getByRole('link', { name: '外部' })).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: '外部' })).toHaveAttribute('rel', 'noreferrer noopener')
    expect(screen.getByRole('link', { name: '内部' })).not.toHaveAttribute('target')
  })
})
