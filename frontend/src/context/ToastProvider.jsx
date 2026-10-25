import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ToastContext from './toastContext'

const TOAST_DURATION_MS = 5000

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())
  // crypto.randomUUID() only exists on secure origins (HTTPS/localhost) and would
  // throw on e.g. http://192.168.x.x, so use a simple counter instead.
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'error') => {
    nextId.current += 1
    const id = nextId.current
    setToasts((current) => [...current, { id, message, type }])
    timers.current.set(id, window.setTimeout(() => dismiss(id), TOAST_DURATION_MS))
  }, [dismiss])

  // Clear pending timers if the provider unmounts.
  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer))
      pending.clear()
    }
  }, [])

  const value = useMemo(() => ({ showToast, dismiss }), [showToast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-4 top-4 z-50 flex flex-col items-stretch gap-3 sm:left-auto sm:right-6 sm:w-96" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'success' ? 'status' : 'alert'}
            className={`flex items-start justify-between gap-4 rounded-2xl border p-4 text-sm shadow-xl ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}
          >
            <span>{toast.message}</span>
            <button onClick={() => dismiss(toast.id)} className="font-bold opacity-70 hover:opacity-100" aria-label="Dismiss notification">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export { ToastProvider }
