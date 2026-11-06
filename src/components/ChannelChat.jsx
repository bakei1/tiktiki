import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { formatTime, initials } from '../lib/dates.js'

export default function ChannelChat({ list, messages, members, currentUser, onSend }) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, list?.id])

  const items = messages
    .filter((message) => message.list_id === list?.id)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))

  const submit = async (event) => {
    event.preventDefault()
    const clean = body.trim()
    if (!clean || sending) return
    setSending(true)
    try {
      await onSend(clean)
      setBody('')
    } catch {
      // The app-level sender displays the failure toast and keeps the draft.
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="channel-chat" aria-label={`${list?.name || 'Kanal'} sohbeti`}>
      <div className="chat-message-list">
        {items.length === 0 ? (
          <div className="chat-empty">
            <span className="chat-empty-mark">#</span>
            <h2>#{list?.name} sohbeti</h2>
            <p>Bu kanalda henüz mesaj yok. İlk mesajı sen yaz.</p>
          </div>
        ) : (
          items.map((message) => {
            const member = members.find(
              (item) => item.list_id === message.list_id && item.user_id === message.user_id,
            )
            const author = message.user_id === currentUser.id
              ? currentUser.name
              : member?.username || 'Kanal üyesi'
            return (
              <article
                className={`chat-message ${message.user_id === currentUser.id ? 'is-own' : ''}`}
                key={message.id}
              >
                <span className="chat-message-avatar">{initials(author)}</span>
                <div className="chat-message-content">
                  <div className="chat-message-meta">
                    <strong>{author}</strong>
                    <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
                  </div>
                  <p>{message.body}</p>
                </div>
              </article>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      <form className="chat-composer" onSubmit={submit}>
        <input
          type="text"
          value={body}
          maxLength={4000}
          onChange={(event) => setBody(event.target.value)}
          placeholder={`#${list?.name} kanalına mesaj yaz…`}
          aria-label="Kanal mesajı"
        />
        <button type="submit" className="chat-send" disabled={!body.trim() || sending} aria-label="Mesaj gönder">
          <Send size={17} />
        </button>
      </form>
    </section>
  )
}
