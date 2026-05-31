import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}

export default function NotificationsBell() {
  const { notifications, markNotificationRead, markAllNotificationsRead, refreshNotifications } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const popoverRef = useRef(null)
  const unread = notifications.filter(n => !n.read_at).length

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  // Refresh on focus so notifications feel live without realtime sub
  useEffect(() => {
    const onFocus = () => refreshNotifications()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshNotifications])

  const handleClick = async (n) => {
    if (!n.read_at) await markNotificationRead(n.id)
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div ref={popoverRef} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) refreshNotifications() }}
        title="Notifications"
        style={{
          background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none',
          padding: '6px 10px', borderRadius: '20px', cursor: 'pointer',
          fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
        🔔
        {unread > 0 && (
          <span style={{
            background: 'var(--accent)', color: 'var(--primary)',
            padding: '0 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
          }}>{unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: '360px', maxHeight: '480px', overflowY: 'auto',
          background: 'white', borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-lg)', color: 'var(--text)',
          zIndex: 200,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <strong style={{ fontSize: '14px' }}>Notifications</strong>
            {unread > 0 && (
              <button onClick={markAllNotificationsRead}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-light)', fontSize: '14px' }}>
              You're all caught up.
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} onClick={() => handleClick(n)}
                style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', background: n.read_at ? 'white' : '#f0f4ff',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '13px' }}>{n.title}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>{timeAgo(n.created_at)}</span>
                </div>
                {n.body && <div style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '4px' }}>{n.body}</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
