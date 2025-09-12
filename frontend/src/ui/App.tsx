import React, { useEffect, useMemo, useRef, useState } from 'react'

type ChatMessage = { id: string; role: 'user'|'assistant'|'system'; content: string; type?: 'text'|'table'|'file' }

const api = {
  send: async (chatId: string, message: string, mode: string) => {
    await fetch('/api/chat/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, message, mode }) })
  },
  stream: (chatId: string, onChunk: (chunk: any)=>void) => {
    const es = new EventSource(`/api/chat/stream/${encodeURIComponent(chatId)}`)
    es.onmessage = (ev) => {
      try { onChunk(JSON.parse(ev.data)) } catch { onChunk(ev.data) }
    }
    es.onerror = () => { es.close() }
    return () => es.close()
  },
  history: async (chatId: string) => {
    const res = await fetch(`/api/chat/history/${encodeURIComponent(chatId)}`)
    return res.json()
  },
  list: async () => (await fetch('/api/chat/list')).json(),
  upload: async (files: File[]) => {
    const fd = new FormData(); files.forEach(f=>fd.append('files', f))
    return (await fetch('/api/files/upload', { method: 'POST', body: fd })).json()
  },
  search: async (q: string) => (await fetch(`/api/search?q=${encodeURIComponent(q)}`)).json(),
}

const defaultModes = [
  { id: 'default', name: 'Обычный' },
  { id: 'coding', name: 'Код' },
  { id: 'analysis', name: 'Аналитика' },
]

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark'|'light'>('dark')
  const [showHelp, setShowHelp] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chatId, setChatId] = useState<string>(()=>crypto.randomUUID())
  const [chats, setChats] = useState<{id:string; title:string}[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [modeOpen, setModeOpen] = useState(false)
  const [mode, setMode] = useState(defaultModes[0].id)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{title:string;url:string;snippet:string}[]|null>(null)

  const rootClass = theme === 'light' ? 'container light' : 'container'

  useEffect(()=>{
    api.list().then(d=>{
      const list = (d.chat_ids as string[]).map(id=>({id, title: `Чат ${id.slice(0,4)}`}))
      setChats(list)
    }).catch(()=>{})
  },[])

  const sendMessage = async () => {
    if (!input.trim()) return
    const text = input
    setInput('')
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages(prev=>[...prev, userMsg])
    await api.send(chatId, text, mode)
    // Start stream
    let assistantId = crypto.randomUUID()
    let acc = ''
    const stop = api.stream(chatId, (chunk)=>{
      if (!chunk) return
      if (typeof chunk === 'string') return
      if (chunk.type === 'token') {
        acc += chunk.content || ''
        setMessages(prev=>{
          const other = prev.filter(m=>m.id !== assistantId)
          const cur = prev.find(m=>m.id === assistantId)
          const newMsg: ChatMessage = cur || { id: assistantId, role: 'assistant', content: '' }
          newMsg.content = acc
          return [...other, newMsg]
        })
      } else if (chunk.type === 'table') {
        const tableText = renderTableText(chunk)
        setMessages(prev=>[...prev, { id: crypto.randomUUID(), role: 'assistant', content: tableText, type: 'table' }])
      } else if (chunk.type === 'end') {
        stop()
      }
    })
  }

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    if (files.length === 0) return
    setUploading(true)
    try { await api.upload(files) } finally { setUploading(false) }
  }

  const doSearch = async () => {
    if (!searchQuery.trim()) return
    const res = await api.search(searchQuery)
    setSearchResults(res.results)
  }

  const toggleTheme = () => setTheme(t=>t==='dark'?'light':'dark')

  return (
    <div className={rootClass}>
      <div className="topLeftMenu">
        {!sidebarOpen && (
          <div className="modeMenu">
            <button className="iconBtn" onClick={()=>setModeOpen(v=>!v)}>Режим: {defaultModes.find(m=>m.id===mode)?.name}</button>
            {modeOpen && (
              <div className="modeList">
                {defaultModes.map(m=> (
                  <div key={m.id} className="modeItem" onClick={()=>{ setMode(m.id); setModeOpen(false) }}>
                    {m.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <header className="header">
        <button className="iconBtn" onClick={()=>setSidebarOpen(v=>!v)}>{sidebarOpen? 'Скрыть панель' : 'Показать панель'}</button>
        <div className="toolbarRight">
          <button className="ghostBtn" onClick={toggleTheme}>Сменить тему</button>
          <div className="helpWrap" onMouseEnter={()=>setShowHelp(true)} onMouseLeave={()=>setShowHelp(false)}>
            <button className="ghostBtn" aria-disabled>Помощь</button>
            {showHelp && (
              <div className="tooltip">Наведите на «Помощь», чтобы увидеть подсказки по использованию интерфейса: отправляйте сообщения, прикрепляйте файлы, используйте веб-поиск и переключайте режимы.</div>
            )}
          </div>
        </div>
      </header>

      <div className="content">
        <aside className="sidebar" style={{ width: sidebarOpen? 300 : 0 }}>
          <div className="sidebarInner">
            <div className="sidebarHeader">
              <button className="primaryBtn" onClick={()=>{ const id = crypto.randomUUID(); setChatId(id); setMessages([]); setChats(prev=>[{id, title: `Чат ${id.slice(0,4)}`}, ...prev]) }}>Новый чат</button>
              <button className="iconBtn">Корзина</button>
            </div>
            <div className="sidebarList">
              {(chats && chats.length>0)? chats.map(c=> (
                <div key={c.id} className="modeItem" onClick={()=>{ setChatId(c.id); api.history(c.id).then(d=> setMessages(d.messages || [])) }}>
                  {c.title}
                </div>
              )) : <div style={{color:'var(--muted)'}}>Нет чатов</div>}
            </div>
            <div className="sidebarFooter">
              <div style={{marginBottom:8}}>
                <div style={{fontWeight:600}}>Иван Иванов</div>
                <div style={{color:'var(--muted)', fontSize:12}}>Инженер-программист</div>
              </div>
              <button className="iconBtn" style={{width:'100%'}}>Выйти</button>
            </div>
          </div>
        </aside>

        <section className="chatArea">
          <div className="messages">
            {messages.map(m=> (
              <div key={m.id} style={{ margin: '8px 0' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.role}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              </div>
            ))}
            {searchResults && (
              <div style={{marginTop:16}}>
                <div style={{fontWeight:600, marginBottom:8}}>Результаты веб-поиска</div>
                {searchResults.map((r,i)=> (
                  <div key={i} style={{marginBottom:8}}>
                    <a href={r.url} target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>{r.title}</a>
                    <div style={{color:'var(--muted)'}}>{r.snippet}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="inputBar">
            <input type="text" placeholder="Введите сообщение..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter' && !e.shiftKey) sendMessage() }} />
            <label className="iconBtn">
              Прикрепить файл
              <input type="file" multiple hidden onChange={onUpload} />
            </label>
            <button className="primaryBtn" onClick={sendMessage} disabled={!input.trim()}>Отправить</button>
          </div>
        </section>
      </div>

      <div className="webSearchBtn">
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" placeholder="web-поиск" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' }} />
          <button className="iconBtn" onClick={doSearch}>Искать</button>
        </div>
      </div>
    </div>
  )
}

function renderTableText(block: any): string {
  if (!block || !Array.isArray(block.rows)) return ''
  const header = (block.headers||[]).join(' | ')
  const sep = (block.headers||[]).map(()=> '---').join(' | ')
  const rows = block.rows.map((r: any[])=> r.join(' | ')).join('\n')
  return `${header}\n${sep}\n${rows}`
}
