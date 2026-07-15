// Vercel 서버리스 함수 — 배포 시 /api/chat 로 자동 노출
// (로컬 개발은 07_GROQ/server.js + Vite 프록시로 처리)

const TEXT_MODEL = 'llama-3.1-8b-instant'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

// 항상 한국어로 답하도록 강제하는 시스템 지시
const SYSTEM_PROMPT = {
  role: 'system',
  content:
    '너는 한국어로만 답하는 어시스턴트다. 사용자가 어떤 언어로 묻든, 항상 자연스럽고 문법에 맞는 한국어로 답하라. ' +
    '코드, 명령어, 고유명사, 이미 영어인 기술 용어는 원문 그대로 두되, 설명 문장은 반드시 한국어로 작성하라.'
}

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

  // 시스템 지시를 맨 앞에 붙여 항상 한국어로 답하게 함
  const withSystem = [SYSTEM_PROMPT, ...messages]

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({ model, messages: withSystem })
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
