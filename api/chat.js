// Vercel 서버리스 함수 — 배포 시 /api/chat 로 자동 노출
// (로컬 개발은 07_GROQ/server.js + Vite 프록시로 처리)

const TEXT_MODEL = 'llama-3.1-8b-instant'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

// messages 안에 이미지가 하나라도 있으면 true
const hasImage = (messages) =>
  messages.some(
    (m) =>
      Array.isArray(m.content) &&
      m.content.some((c) => c.type === 'image_url')
  )

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: 'POST 요청만 허용됨' })
  }

  const key = process.env.GROQ_API_KEY
  if (!key) {
    return res.status(500).json({ reply: 'GROQ_API_KEY 환경변수가 설정되지 않음' })
  }

  const { messages } = req.body   // Vercel이 JSON body 자동 파싱
  const model = hasImage(messages) ? VISION_MODEL : TEXT_MODEL

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({ model, messages })
    })

    const data = await groqRes.json()

    if (data.error) {
      return res.status(groqRes.status).json({ reply: data.error.message })
    }

    const reply = data.choices?.[0]?.message?.content || '(응답 없음)'
    res.status(200).json({ reply })
  } catch (err) {
    res.status(500).json({ reply: '서버 오류: ' + err.message })
  }
}
