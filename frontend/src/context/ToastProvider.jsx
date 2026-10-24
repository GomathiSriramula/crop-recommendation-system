import { useCallback, useMemo, useState } from 'react'
import ToastContext from './toastContext'

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'error') => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current, { id, message, type }])
    window.setTimeout(() => dismiss(id), 5000)
  }, [dismiss])

  const value = useMemo(() => ({ showToast, dismiss }), [showToast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-4 top-4 z-50 flex flex-col items-stretch gap-3 sm:left-auto sm:right-6 sm:w-96" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`flex items-start justify-between gap-4 rounded-2xl border p-4 text-sm shadow-xl ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            <span>{toast.message}</span>
            <button onClick={() => dismiss(toast.id)} className="font-bold opacity-70 hover:opacity-100" aria-label="Dismiss notification">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export { ToastProvider }
