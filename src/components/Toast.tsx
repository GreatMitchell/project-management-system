import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'
interface Toast { id: number; message: string; kind: ToastKind }
interface ToastContextValue { notify: (message: string, kind?: ToastKind) => void }
const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts((items) => items.filter((item) => item.id !== id)), [])
  const notify = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((items) => [...items, { id, message, kind }])
    window.setTimeout(() => dismiss(id), 4200)
  }, [dismiss])
  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[70] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? AlertCircle : Info
          const tone = toast.kind === 'error'
            ? 'border-rose-400/35 text-rose-200 bg-rose-950/80'
            : toast.kind === 'info'
              ? 'border-lineStrong/35 text-text-primary bg-surface/92'
              : 'border-emerald-400/30 text-text-primary bg-surface/92'
          return (
            <div key={toast.id} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-card backdrop-blur ${tone}`}>
              <Icon size={19} className={toast.kind === 'error' ? 'text-rose-300' : toast.kind === 'success' ? 'text-emerald-400' : 'text-accent-primary'} />
              <span className="flex-1 text-sm">{toast.message}</span>
              <button onClick={() => dismiss(toast.id)} aria-label="关闭通知" className="text-current/70 transition hover:text-current">
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
