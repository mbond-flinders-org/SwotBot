import { NextRequest, NextResponse } from "next/server"

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
const MODEL = "openai/gpt-oss-120b"

async function groqChat(systemPrompt: string, userMessage: string) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content.trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode, notes, question, answer } = body

    if (mode === "generate") {
      if (!notes || notes.trim().length < 20) {
        return NextResponse.json(
          { error: "Please provide more study notes (at least a few sentences)." },
          { status: 400 }
        )
      }

      const systemPrompt = `You are a friendly study quiz maker called SwotBot. Given the student's study notes, generate exactly 5 short-answer quiz questions that test understanding of the material. Return ONLY a valid JSON array of 5 strings, with no extra text, no markdown, no code fences. Example: ["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]`

      const raw = await groqChat(systemPrompt, `Study notes:\n\n${notes}`)

      let questions: string[]
      try {
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
        questions = JSON.parse(cleaned)
      } catch {
        const match = raw.match(/\[[\s\S]*\]/)
        if (match) {
          questions = JSON.parse(match[0])
        } else {
          throw new Error("Could not parse questions from AI response")
        }
      }

      if (!Array.isArray(questions) || questions.length < 1) {
        throw new Error("AI did not return enough questions")
      }

      return NextResponse.json({ questions: questions.slice(0, 5) })
    }

    if (mode === "grade") {
      if (!question || !answer) {
        return NextResponse.json(
          { error: "Missing question or answer." },
          { status: 400 }
        )
      }

      const systemPrompt = `You are a warm, encouraging grading assistant. Grade the student's answer on a scale of 0 to 10 based on correctness and completeness. Return ONLY valid JSON: {"score": <number 0-10>, "feedback": "<one encouraging sentence>"}. No extra text, no markdown, no code fences.`

      const userMsg = `Study notes for reference:\n${notes || "(none)"}\n\nQuestion: ${question}\n\nStudent's answer: ${answer}`

      const raw = await groqChat(systemPrompt, userMsg)

      let result: { score: number; feedback: string }
      try {
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
        result = JSON.parse(cleaned)
      } catch {
        const match = raw.match(/\{[\s\S]*\}/)
        if (match) {
          result = JSON.parse(match[0])
        } else {
          throw new Error("Could not parse grading from AI response")
        }
      }

      result.score = Math.max(0, Math.min(10, Math.round(result.score)))
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
  } catch (err: any) {
    console.error("API error:", err)
    return NextResponse.json(
      { error: err.message || "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
