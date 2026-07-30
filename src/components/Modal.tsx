import { AlertTriangle, X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  width?: string
}

export function Modal({ open, title, description, onClose, children, width = 'max-w-xl' }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/60 p-4 backdrop-blur-md" role="presentation" onMouseDown={onClose}>
      <section
        className={`max-h-[92vh] w-full ${width} overflow-y-auto rounded-[var(--radius-card)] border border-line/20 bg-surface/95 shadow-card`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-line/15 bg-surface/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 id="modal-title" className="font-serif text-2xl font-semibold text-text-primary">{title}</h2>
            {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={19} />
          </button>
        </header>
        <div className="p-6">{children}</div>
      </section>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = '确认', danger = false, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="flex gap-4 rounded-2xl border border-amber-300/30 bg-accent-soft/70 p-4 text-text-primary">
        <AlertTriangle className="mt-0.5 shrink-0 text-accent-primary" size={20} />
        <p className="text-sm leading-6">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="button-secondary" onClick={onClose}>取消</button>
        <button className={danger ? 'button-danger' : 'button-primary'} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}
