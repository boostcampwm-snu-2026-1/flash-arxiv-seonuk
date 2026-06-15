const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent'

export async function summarizePaper(title, abstract) {
  const prompt = `다음 논문을 한국어로 핵심 내용 3가지 불렛으로 요약해줘. 형식은 정확히 아래처럼 "- "으로 시작하는 3줄로만 답해줘. 각 문장은 마침표로 끝내고, 다른 설명은 절대 추가하지 마.

- (첫 번째 핵심 내용.)
- (두 번째 핵심 내용.)
- (세 번째 핵심 내용.)

제목: ${title}
초록: ${abstract}`

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Gemini API error ${res.status}`)
  }

  const data = await res.json()
  return data.candidates[0].content.parts[0].text.trim()
}
