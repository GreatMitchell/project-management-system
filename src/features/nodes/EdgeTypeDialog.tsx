import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { edgeTypeLabels } from '../../domain/rules'
import type { EdgeType } from '../../domain/types'

interface Props {
  open: boolean
  currentEdgeType?: EdgeType
  onClose: () => void
  onConfirm: (edgeType: EdgeType | undefined) => Promise<void>
}

export function EdgeTypeDialog({ open, currentEdgeType, onClose, onConfirm }: Props) {
  const [selectedType, setSelectedType] = useState<EdgeType | undefined>(currentEdgeType)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await onConfirm(selectedType)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal 
      open={open} 
      title="选择边类型" 
      description="为科研项目的连接指定语义类型"
      onClose={onClose}
      width="max-w-md"
    >
      <div className="space-y-3">
        <button
          className={`w-full rounded-2xl border p-4 text-left transition hover:border-accent-primary/60 hover:bg-surface2 ${
            selectedType === undefined ? 'border-accent-primary/40 bg-accent-soft/40' : 'border-line/15 bg-surface'
          }`}
          onClick={() => setSelectedType(undefined)}
        >
          <div className="font-medium text-text-primary">无特定类型</div>
          <p className="mt-1 text-xs text-text-secondary">一般的依赖或推导关系</p>
        </button>

        {(Object.entries(edgeTypeLabels) as [EdgeType, string][]).map(([type, label]) => (
          <button
            key={type}
            className={`w-full rounded-2xl border p-4 text-left transition hover:border-accent-primary/60 hover:bg-surface2 ${
              selectedType === type ? 'border-accent-primary/40 bg-accent-soft/40' : 'border-line/15 bg-surface'
            }`}
            onClick={() => setSelectedType(type)}
          >
            <div className="font-medium text-text-primary">{label}</div>
            <p className="mt-1 text-xs text-text-secondary">
              {type === 'exposes' && '方案暴露了某个漏洞或弱点'}
              {type === 'patches' && '方案填补了已知的缺陷'}
              {type === 'inherits' && '方案继承了另一方案的缺陷'}
              {type === 'weakens' && '方案削弱了某个假设'}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button className="button-secondary" onClick={onClose}>
          取消
        </button>
        <button className="button-primary" disabled={saving} onClick={submit}>
          {saving ? '保存中…' : '确认'}
        </button>
      </div>
    </Modal>
  )
}
