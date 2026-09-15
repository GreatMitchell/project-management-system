import { Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { MarkdownContent } from '../../components/MarkdownContent'

type Mode = 'edit' | 'preview'

interface Props {
  id: string
  fieldName: string
  label: ReactNode
  value: string
  registration: UseFormRegisterReturn
  rows: number
  maxLength: number
  placeholder: string
  error?: string
  autoFocus?: boolean
}

export function MarkdownEditorField({ id, fieldName, label, value, registration, rows, maxLength, placeholder, error, autoFocus = false }: Props) {
  const [mode, setMode] = useState<Mode>('edit')
  const [fullscreen, setFullscreen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const savedSelection = useRef<[number, number] | null>(null)
  const focusInitialized = useRef(false)
  const { ref: registerRef, ...registerProps } = registration
  const panelId = `${id}-${mode}-panel`; const tabListLabel = fieldName.includes('日志') ? '日志 Markdown 编辑模式' : '正文 Markdown 编辑模式'

  const switchMode = (next: Mode) => {
    if (next !== 'edit') {
      const element = textareaRef.current
      if (element) savedSelection.current = [element.selectionStart ?? 0, element.selectionEnd ?? 0]
    }
    setMode(next)
  }

  const setRefs = (element: HTMLTextAreaElement | null) => { textareaRef.current = element; registerRef(element) }

  const onTogglePreviewKey = (event: ReactKeyboardEvent) => {
    if (!((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'v' || event.key === 'V'))) return
    event.preventDefault()
    switchMode(mode === 'edit' ? 'preview' : 'edit')
  }

  useLayoutEffect(() => {
    const element = textareaRef.current
    if (!element) return
    if (fullscreen) { element.style.height = ''; return }
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [value, mode, fullscreen])

  useEffect(() => {
    if (!focusInitialized.current) { focusInitialized.current = true; return }
    if (mode === 'preview') { previewRef.current?.focus(); return }
    const element = textareaRef.current
    if (!element) return
    element.focus()
    const saved = savedSelection.current
    if (saved && element.value.length >= saved[1]) element.setSelectionRange(saved[0], saved[1])
    savedSelection.current = null
  }, [mode, fullscreen])

  useEffect(() => {
    if (!fullscreen) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreen])

  return (
    <div className={`field markdown-editor-field${fullscreen ? ' editor-fullscreen' : ''}`}>
      <div className="markdown-editor-heading">
        <label className="markdown-editor-label" htmlFor={id}>{label}</label>
        <div className="markdown-editor-actions">
          <div className="markdown-editor-tabs" role="tablist" aria-label={tabListLabel}>
            <button type="button" role="tab" aria-selected={mode === 'edit'} aria-controls={`${id}-edit-panel`} onClick={() => switchMode('edit')}>编辑</button>
            <button type="button" role="tab" aria-selected={mode === 'preview'} aria-controls={`${id}-preview-panel`} onClick={() => switchMode('preview')}>预览</button>
          </div>
          <button type="button" className="markdown-editor-expand" aria-pressed={fullscreen} title={fullscreen ? '退出全屏（Esc）' : '全屏书写'} onClick={() => setFullscreen(open => !open)}>
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{fullscreen ? '退出全屏' : '全屏'}</span>
          </button>
        </div>
      </div>
      <div id={panelId} role="tabpanel" className="markdown-editor-panes">
        {mode === 'edit' && <textarea id={id} ref={setRefs} rows={rows} style={{ minHeight: `${rows * 1.5 + 1.75}rem` }} maxLength={maxLength} autoFocus={autoFocus} placeholder={placeholder} onKeyDown={onTogglePreviewKey} {...registerProps} />}
        {mode === 'preview' && <div ref={previewRef} tabIndex={-1} onKeyDown={onTogglePreviewKey} className="markdown-preview"><MarkdownContent source={value ?? ''} emptyText={`暂无${fieldName}可供预览`} /></div>}
      </div>
      <div className="markdown-editor-meta"><span className={value.length >= maxLength ? 'text-amber-300' : undefined}>{value.length.toLocaleString()} / {maxLength.toLocaleString()}</span>{error && <small>{error}</small>}</div>
    </div>
  )
}
