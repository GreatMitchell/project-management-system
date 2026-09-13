import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import type { PraxisNode } from '../../domain/types'
import { markdownToPlainText } from './markdown'

interface Props { open: boolean; nodes: PraxisNode[]; onClose: () => void; onSelect: (node: PraxisNode) => void; title?: string; description?: string }

const typeLabels: Record<PraxisNode['type'], string> = { question: '问题', solution: '方案', result: '结果', assumption: '假设', vulnerability: '缺陷' }

export function NodeSearchDialog({ open, nodes, onClose, onSelect, title, description }: Props) {
  const [query, setQuery] = useState('')
  useEffect(() => { if (open) setQuery('') }, [open])
  const keyword = query.trim().toLowerCase()
  const results = useMemo(() => (keyword ? nodes.filter((node) => node.content.toLowerCase().includes(keyword) || node.log.toLowerCase().includes(keyword)) : nodes), [keyword, nodes])

  return (
    <Modal open={open} title={title ?? '搜索节点'} description={description ?? '输入关键字，按节点内容或附加日志匹配，不区分大小写'} onClose={onClose} width="max-w-xl">
      <label className="search-box w-full">
        <Search size={17} />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索节点内容或附加日志" aria-label="搜索节点" />
      </label>
      <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
        {results.map((node) => {
          const codePrefix = node.type === 'question' ? 'Q' : node.type === 'solution' ? 'S' : node.type === 'result' ? 'R' : node.type === 'assumption' ? 'A' : 'V'
          return (
            <button
              key={node.id}
              className="w-full rounded-2xl border border-line/15 bg-surface p-4 text-left transition hover:border-accent-primary/60 hover:bg-surface2"
              onClick={() => onSelect(node)}
            >
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="tech-module-label" aria-hidden="true">{codePrefix} / {(node.position + 1).toString().padStart(2, '0')}</span>
                <span className="font-semibold uppercase tracking-widest">{typeLabels[node.type]}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-text-primary">{markdownToPlainText(node.content, 200) || '（空内容）'}</p>
            </button>
          )
        })}
        {!results.length && <p className="py-8 text-center text-sm text-text-secondary">没有匹配的节点。</p>}
      </div>
    </Modal>
  )
}
