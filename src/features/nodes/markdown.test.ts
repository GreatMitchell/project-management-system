import { describe, expect, it } from 'vitest'
import { markdownToPlainText } from './markdown'

describe('markdownToPlainText', () => {
  it('保留语义文本并移除 Markdown 标记', () => {
    const source = ['# **实验**结论', '', '- [x] 完成 [验证](https://example.com)', '- 观察 ![曲线图](https://images.example/plot.png)', '', '> 公式 $E = mc^2$', '', '```python', 'print("result")', '```'].join('\n')
    expect(markdownToPlainText(source)).toBe('实验结论 完成 验证 观察 曲线图 公式 E = mc^2 print("result")')
  })

  it('移除原始 HTML 并合并空白', () => {
    expect(markdownToPlainText('<script>alert(1)</script>\n\n普通   文本')).toBe('alert(1) 普通 文本')
  })

  it('按指定长度截断并添加省略号', () => {
    expect(markdownToPlainText('一个很长的 Markdown 摘要', 7)).toBe('一个很长的…')
    expect(markdownToPlainText('无需截断', 20)).toBe('无需截断')
  })
})
