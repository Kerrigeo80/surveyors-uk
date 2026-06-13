import { useMemo, useState } from 'react'
import { useApp } from '../lib/AppContext.jsx'
import { getInitials, formatDateGB, unreadInConversation } from '../lib/data.js'
import ConversationThread from './ConversationThread.jsx'

// Inbox: conversation list on the left, active thread on the right.
export default function Messages() {
  const { currentUser, conversations, users, requests, sendMessage } = useApp()
  const myId = currentUser?.id

  // Decorate each conversation with peer name, request title, unread count + last activity.
  const items = useMemo(() => {
    return (conversations || []).map(c => {
      const peerId = c.requester_id === myId ? c.surveyor_id : c.requester_id
      const peer = users.find(u => u.id === peerId)
      const peerName = peer ? (peer.councilName || peer.businessName || peer.name) : 'Unknown'
      const request = requests.find(r => r.id === c.request_id)
      const last = c.messages[c.messages.length - 1] || null
      return {
        conv: c,
        peerName,
        requestTitle: request?.title || 'Survey request',
        unread: unreadInConversation(c, myId),
        last,
        lastAt: last?.created_at || c.created_at,
      }
    }).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
  }, [conversations, users, requests, myId])

  const [activeId, setActiveId] = useState(() => items[0]?.conv.id || null)
  const active = items.find(i => i.conv.id === activeId) || items[0] || null

  if (items.length === 0) {
    return (
      <div className="card">
        <div className="card-header"><span className="card-title">Messages</span></div>
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>No conversations yet</h3>
          <p>Messages with {currentUser?.role === 'surveyor' ? 'requesters' : 'surveyors'} about a request will appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Messages</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: '16px', alignItems: 'start' }}>
        {/* Conversation list */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', maxHeight: '420px', overflowY: 'auto' }}>
          {items.map(it => {
            const isActive = it.conv.id === active?.conv.id
            return (
              <div key={it.conv.id} onClick={() => setActiveId(it.conv.id)}
                style={{
                  padding: '12px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: isActive ? '#f0f4ff' : 'white', display: 'flex', gap: '10px', alignItems: 'start',
                }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0,
                }}>
                  {getInitials(it.peerName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.peerName}</span>
                    {it.unread > 0 && (
                      <span className="badge" style={{ background: 'var(--accent)', color: 'var(--primary)', flexShrink: 0 }}>{it.unread}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {it.requestTitle}
                  </div>
                  {it.last && (
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {it.last.sender_id === myId ? 'You: ' : ''}{it.last.body}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Active thread */}
        <div>
          {active && (
            <>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 600 }}>{active.peerName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                  {active.requestTitle} · started {formatDateGB(active.conv.created_at)}
                </div>
              </div>
              <ConversationThread
                key={active.conv.id}
                conversation={active.conv}
                peerName={active.peerName}
                send={(body) => sendMessage({ conversationId: active.conv.id, body })}
                height={360}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
