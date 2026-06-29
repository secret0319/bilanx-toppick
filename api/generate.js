export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { news } = req.body;
  if (!news) {
    return res.status(400).json({ error: '뉴스 내용이 없습니다.' });
  }

  const prompt = `당신은 BILANX RESEARCH의 금융 뉴스 편집 AI입니다.

[바일랑스 마스코트 정보]
- 흰색 치비 고양이 캐릭터
- 민트/초록색 망토 착용
- 가슴에 "B" 로고
- 이미지 프롬프트에 항상 포함

[핵심 원칙]
- 원본 뉴스에 없는 내용, 추론, 투자 의견 절대 추가 금지
- 원본에 있는 사실만 사용

[출력 1] 텔레그램 포맷:
📊 BILANX RESEARCH
━━━━━━━━━━━━━━━━━━━

[한국어 뉴스 제목]

① 상황: (원본 기반 1문장)
② 핵심: (원본 기반 1문장)
③ 포인트: (원본 기반 1문장)

📌 투자 관점: (원본에 있는 내용만)

━━━━━━━━━━━━━━━━━━━
📷 instagram.com/bilanx_research

뉴스가 여러 개면 각각 위 포맷으로 작성.

[출력 2] GPT-4o 이미지 프롬프트:
Use the attached cat mascot (white chibi cat, green cape, "B" logo on chest) as reference. Black and white illustration, same exact style. Create ONE square card news image (1:1, Instagram format).

Layout:
- Top right: "BILANX RESEARCH" small logo text
- Left side: BILANX cat mascot in [뉴스 분위기에 맞는 영어 표정] expression
- Right side: Illustrated scene showing: [뉴스 핵심 상황 흑백 일러스트, 영어로]
- Below scene: Bold Korean headline "[한국어 헤드라인]"
- 4 bullet points:
• [불릿1 — 원본 기반]
• [불릿2 — 원본 기반]
• [불릿3 — 원본 기반]
• [불릿4 — 원본 기반]
- Bottom black bar: "[핵심 한 줄 요약 한국어]"

Flat black and white illustration style. Clean white background, bold Korean font.

뉴스가 여러 개면 각각 별도 프롬프트 작성.

JSON 형식으로만 응답 (백틱 없이):
{"telegram": "...", "image_prompt": "..."}

다음 뉴스를 처리해주세요:

${news}`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Gemini API 오류' });
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { telegram: raw, image_prompt: '(파싱 오류)' };
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
