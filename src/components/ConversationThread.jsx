import { useEffect, useRef, useState } from 'react'
import { useApp } from '../lib/AppContext.jsx'
import { formatDateGB } from '../lib/data.js'

// A single chat thread: message bubbles + composer.
// Props:
//   conversation — { id, messages: [...] } or null (nothing sent yet)
//   peerName     — the other party's display name
//   send         — (body: string) => Promise<bool>, supplied by parent
//   height       — scroll-area height in px (default 320)
export default function ConversationThread({ conversation, peerName, send, height = 320 }) {
  const { currentUser, markConversationRead } = useApp()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)

  const messages = conversation?.messages || []

  // Auto-scroll to the latest message whenever the thread changes.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, conversation?.id])

  // Mark the other party's messages read when this thread is shown.
  useEffect(() => {
    if (conversation?.id) markConversationRead(conversation.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, messages.length])

  const handleSend = async (e) => {
    e.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    const ok = await send(body)
    setSending(false)
    if (ok) setText('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <div ref={scrollRef} style={{ height, overflowY: 'auto', padding: '14px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-light)', fontSize: '13px' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>💬</div>
            Say hello to {peerName}.
          </div>
        ) : (
          messages.map(m => {
            const mine = m.sender_id === currentUser?.id
            return (
              <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                <div style={{
                  padding: '8px 12px', borderRadius: '14px', fontSize: '14px', lineHeight: 1.45,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  background: mine ? 'var(--primary)' : 'white',
                  color: mine ? 'white' : 'var(--text)',
                  border: mine ? 'none' : '1px solid var(--border)',
                  borderBottomRightRadius: mine ? '4px' : '14px',
                  borderBottomLeftRadius: mine ? '14px' : '4px',
                }}>
                  {m.body}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px', textAlign: mine ? 'right' : 'left' }}>
                  {formatDateGB(m.created_at, false)} · {new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )
          })
        )}
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', padding: '10px', borderTop: '1px solid var(--border)', background: 'white' }}>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`Message ${peerName}…`}
          style={{ flex: 1, margin: 0 }}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !text.trim()}>
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
