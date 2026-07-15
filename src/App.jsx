import { useState, useRef, useEffect } from 'react'
import './App.css'
import clipIcon from './assets/clip.png'

// 텍스트로 읽을 파일 확장자 (MIME이 비어도 이걸로 판단)
const TEXT_EXT = /\.(txt|md|markdown|json|csv|tsv|js|jsx|ts|tsx|html|css|py|java|c|cpp|go|rs|rb|php|xml|yaml|yml|log|sh|sql|env)$/i

function App() {
  const [messages, setMessages] = useState([])   // {role, content} — content는 문자열 또는 배열
  const [input, setInput] = useState('')
  const [attach, setAttach] = useState(null)      // null | {kind:'image', name, url} | {kind:'text', name, text}
  const [notice, setNotice] = useState('')        // 지원 안 되는 파일 알림
  const [menuOpen, setMenuOpen] = useState(false)  // 좌측 상단 리스트 메뉴 열림 여부
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')  // 다크모드
  const [loading, setLoading] = useState(false)
  const logRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [messages, loading])

  // 다크모드 선택 유지 (새로고침해도)
  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  // 파일 선택 → 종류 판별 후 이미지/텍스트/거부 처리
  const handleFile = (e) => {
    const file = e.target.files[0]
    e.target.value = ''            // 같은 파일 다시 선택 가능하게 초기화
    if (!file) return
    setNotice('')

    const isImage = file.type.startsWith('image/')
    const isText = file.type.startsWith('text/') || TEXT_EXT.test(file.name)

    if (isImage) {
      const reader = new FileReader()
      reader.onload = () => setAttach({ kind: 'image', name: file.name, url: reader.result })
      reader.readAsDataURL(file)   // base64 data URL
    } else if (isText) {
      const reader = new FileReader()
      reader.onload = () => setAttach({ kind: 'text', name: file.name, text: reader.result })
      reader.readAsText(file)      // 순수 텍스트
    } else {
      setAttach(null)
      setNotice(`읽을 수 없는 파일이야: ${file.name}`)
    }
  }

  const sendMessage = async () => {
    if ((!input.trim() && !attach) || loading) return

    let content
    if (attach?.kind === 'image') {
      // 멀티모달 배열 → 서버가 비전 모델로 라우팅
      content = [
        ...(input.trim() ? [{ type: 'text', text: input }] : []),
        { type: 'image_url', image_url: { url: attach.url } }
      ]
    } else if (attach?.kind === 'text') {
      // 파일 내용을 텍스트로 붙여 일반 모델에 전달
      const fileBlock = `\n\n${attach.name}:\n\`\`\`\n${attach.text}\n\`\`\``
      content = (input.trim() || '이 파일을 읽고 설명해줘.') + fileBlock
    } else {
      content = input
    }

    const nextMessages = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')
    setAttach(null)
    setNotice('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages })
      })
      const data = await res.json()
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setMessages([...nextMessages, { role: 'assistant', content: '네트워크 오류: ' + err.message }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage()
  }

  // 새 세팅: 모든 내역 삭제하고 처음부터
  const newSession = () => {
    setMessages([])
    setInput('')
    setAttach(null)
    setNotice('')
    setMenuOpen(false)
  }

  // 말풍선 content(문자열 또는 배열) 렌더
  const renderContent = (content) => {
    if (typeof content === 'string') return content
    return content.map((part, j) =>
      part.type === 'image_url'
        ? <img key={j} className="bubble-img" src={part.image_url.url} alt="첨부 이미지" />
        : <span key={j}>{part.text}</span>
    )
  }

  // 다크/라이트 전환
  const toggleDark = () => {
    setDark((v) => !v)
    setMenuOpen(false)
  }

  return (
    <div className={`chat-wrap ${dark ? 'dark' : ''}`}>
      <div className="chat-header">
        <div className="menu-wrap">
          <button className="list-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="메뉴">
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
          </button>
          {menuOpen && (
            <div className="menu-dropdown">
              <button className="menu-item" onClick={newSession}>새 채팅 시작</button>
              <button className="menu-item" onClick={toggleDark}>
                {dark ? '라이트모드로 전환' : '다크모드로 전환'}
              </button>
            </div>
          )}
        </div>
        <span className="chat-title">GROQ Chat</span>
      </div>
      <div className="chat-log" ref={logRef}>
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {renderContent(m.content)}
          </div>
        ))}
        {loading && <div className="bubble assistant">생각 중...</div>}
      </div>

      {notice && <div className="notice">{notice}</div>}

      {attach && (
        <div className="preview-row">
          {attach.kind === 'image'
            ? <img className="preview-img" src={attach.url} alt="첨부 미리보기" />
            : <span className="file-chip">{attach.name}</span>}
          <button className="preview-remove" onClick={() => setAttach(null)}>✕</button>
        </div>
      )}

      <div className="input-row">
        <input
          type="file"
          accept="image/*,text/*,.md,.json,.csv,.js,.jsx,.ts,.tsx,.html,.css,.py,.xml,.yml,.yaml,.log"
          ref={fileRef}
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        <button className="attach-btn" onClick={() => fileRef.current.click()} disabled={loading}>
          <img className="attach-icon" src={clipIcon} alt="파일 첨부" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력, 이미지, 텍스트 파일 첨부 가능"
        />
        <button onClick={sendMessage} disabled={loading}>전송</button>
      </div>
    </div>
  )
}

export default App
