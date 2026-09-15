import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { useForm } from 'react-hook-form'
import { MarkdownEditorField } from './MarkdownEditorField'

function Harness() {
  const { register, watch } = useForm<{ content: string }>({ defaultValues: { content: '' } })
  return <MarkdownEditorField id="test-markdown" fieldName="节点内容" label="节点内容" value={watch('content')} registration={register('content')} rows={4} maxLength={100} placeholder="输入内容" />
}

afterEach(cleanup)

describe('MarkdownEditorField', () => {
  it('在编辑与预览之间切换时保留 Markdown 源文', async () => {
    const user = userEvent.setup(); render(<Harness />)
    await user.type(screen.getByLabelText('节点内容'), '# 结论')
    await user.click(screen.getByRole('tab', { name: '预览' }))
    expect(screen.getByRole('heading', { name: '结论' })).toBeVisible()
    expect(screen.getByRole('tab', { name: '预览' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: '编辑' }))
    expect(screen.getByLabelText('节点内容')).toHaveValue('# 结论')
  })

  it('为空内容显示预览占位', async () => {
    const user = userEvent.setup(); render(<Harness />)
    await user.click(screen.getByRole('tab', { name: '预览' }))
    expect(screen.getByText('暂无节点内容可供预览')).toBeVisible()
  })

  it('全屏书写模式下保留内容，Esc 退出', async () => {
    const user = userEvent.setup(); render(<Harness />)
    const textarea = screen.getByLabelText('节点内容')
    await user.type(textarea, '需要沉浸书写的长文')
    await user.click(screen.getByRole('button', { name: '全屏' }))
    expect(document.querySelector('.markdown-editor-field.editor-fullscreen')).not.toBeNull()
    expect(screen.getByLabelText('节点内容')).toHaveValue('需要沉浸书写的长文')
    expect(screen.getByLabelText('节点内容')).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(document.querySelector('.markdown-editor-field.editor-fullscreen')).toBeNull()
    expect(screen.getByLabelText('节点内容')).toHaveValue('需要沉浸书写的长文')
  })

  it('Ctrl+Shift+V 在编辑与预览间切换并保留焦点与光标', async () => {
    const user = userEvent.setup(); render(<Harness />)
    const textarea = screen.getByLabelText('节点内容')
    await user.type(textarea, '# 快捷键切换')
    await user.keyboard('{Control>}{Shift>}v{/Shift}{/Control}')
    expect(screen.getByRole('heading', { name: '快捷键切换' })).toBeVisible()
    expect(screen.queryByLabelText('节点内容')).toBeNull()
    expect(document.activeElement).toHaveClass('markdown-preview')
    await user.keyboard('{Control>}{Shift>}v{/Shift}{/Control}')
    expect(screen.getByLabelText('节点内容')).toHaveValue('# 快捷键切换')
    expect(screen.getByLabelText('节点内容')).toHaveFocus()
  })
})
