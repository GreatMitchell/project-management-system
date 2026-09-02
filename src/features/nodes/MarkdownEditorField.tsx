import { useState, type ReactNode } from 'react'
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
  const panelId = `${id}-${mode}-panel`; const tabListLabel = fieldName.includes('日志') ? '日志 Markdown 编辑模式' : '正文 Markdown 编辑模式'
  return <div className="field markdown-editor-field"><div className="markdown-editor-heading"><label className="markdown-editor-label" htmlFor={id}>{label}</label><div className="markdown-editor-tabs" role="tablist" aria-label={tabListLabel}><button type="button" role="tab" aria-selected={mode === 'edit'} aria-controls={`${id}-edit-panel`} onClick={() => setMode('edit')}>编辑</button><button type="button" role="tab" aria-selected={mode === 'preview'} aria-controls={`${id}-preview-panel`} onClick={() => setMode('preview')}>预览</button></div></div>{mode === 'edit' ? <div id={panelId} role="tabpanel"><textarea id={id} rows={rows} maxLength={maxLength} autoFocus={autoFocus} {...registration} placeholder={placeholder} /></div> : <div id={panelId} role="tabpanel" className="markdown-preview"><MarkdownContent source={value ?? ''} emptyText={`暂无${fieldName}可供预览`} /></div>}<div className="markdown-editor-meta"><span className={value.length >= maxLength ? 'text-amber-300' : undefined}>{value.length.toLocaleString()} / {maxLength.toLocaleString()}</span>{error && <small>{error}</small>}</div></div>
}
