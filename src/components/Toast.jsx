import { useEffect } from 'react'

export function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className="toast" onClick={onDismiss}>
      {message}
    </div>
  )
}
