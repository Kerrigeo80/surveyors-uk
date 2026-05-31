import { useApp } from '../lib/AppContext.jsx'

export default function Toasts() {
  const { toasts } = useApp()
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={'toast' + (t.type ? ' ' + t.type : '')}>
          {t.type === 'success' ? '✅ ' : t.type === 'error' ? '❌ ' : 'ℹ️ '}
          {t.message}
        </div>
      ))}
    </div>
  )
}
