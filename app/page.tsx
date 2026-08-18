"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import confetti from "canvas-confetti"

interface GradeResult {
  score: number
  feedback: string
}

interface QuestionResult {
  question: string
  answer: string
  score: number
  feedback: string
}

type AppState = "input" | "quiz" | "results"

export default function SwotBot() {
  const [state, setState] = useState<AppState>("input")
  const [notes, setNotes] = useState("")
  const [questions, setQuestions] = useState<string[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswer, setUserAnswer] = useState("")
  const [results, setResults] = useState<QuestionResult[]>([])
  const [loading, setLoading] = useState(false)
  const [grading, setGrading] = useState(false)
  const [currentGrade, setCurrentGrade] = useState<GradeResult | null>(null)
  const [showGrade, setShowGrade] = useState(false)
  const [error, setError] = useState("")
  const [quizKey, setQuizKey] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const ringRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    if (state === "input" && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [state])

  useEffect(() => {
    if (showGrade && ringRef.current) {
      const offset = 251.2 - (251.2 * (currentGrade?.score ?? 0)) / 10
      ringRef.current.style.strokeDashoffset = String(offset)
    }
  }, [showGrade, currentGrade])

  const fireConfetti = useCallback(() => {
    const end = Date.now() + 600
    const colors = ["#FFB347", "#FF6B6B", "#87BBA2", "#FFD93D", "#FF8A80"]
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [])

  const generateQuiz = async () => {
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate", notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate quiz")
      setQuestions(data.questions)
      setQuizKey((k) => k + 1)
      setState("quiz")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submitAnswer = async () => {
    if (!userAnswer.trim()) return
    setError("")
    setGrading(true)
    setShowGrade(false)
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "grade",
          notes,
          question: questions[currentIdx],
          answer: userAnswer,
        }),
      })
      const data: GradeResult & { error?: string } = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to grade answer")
      setCurrentGrade(data)
      setShowGrade(true)
      setResults((prev) => [
        ...prev,
        { question: questions[currentIdx], answer: userAnswer, ...data },
      ])
      if (data.score >= 8) fireConfetti()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGrading(false)
    }
  }

  const nextQuestion = () => {
    if (currentIdx + 1 >= questions.length) {
      setState("results")
    } else {
      setCurrentIdx((i) => i + 1)
      setUserAnswer("")
      setCurrentGrade(null)
      setShowGrade(false)
    }
  }

  const resetQuiz = () => {
    setState("input")
    setNotes("")
    setQuestions([])
    setCurrentIdx(0)
    setUserAnswer("")
    setResults([])
    setCurrentGrade(null)
    setShowGrade(false)
    setError("")
  }

  const totalScore = results.reduce((s, r) => s + r.score, 0)
  const avgScore = results.length > 0 ? (totalScore / results.length).toFixed(1) : "0"
  const hasHighScores = results.some((r) => r.score >= 8)

  const scoreColor = (s: number) =>
    s >= 8 ? "#87BBA2" : s >= 5 ? "#FFB347" : "#FF6B6B"

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 md:py-12">
      <header className="text-center mb-8 animate-fade-in">
        <div className="text-6xl mb-2 select-none">🦉</div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 tracking-tight">
          Swot<span className="text-coral">Bot</span>
        </h1>
        <p className="text-gray-500 mt-1 text-lg">
          Paste your notes — get a quiz — ace the exam!
        </p>
      </header>

      <main className="w-full max-w-2xl">
        {state === "input" && (
          <div className="animate-fade-in">
            <div className="bg-white rounded-3xl card-shadow p-6 md:p-8">
              <label className="block text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                Your Study Notes
              </label>
              <textarea
                ref={textareaRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste your lecture notes, textbook summary, or anything you want to be quizzed on... 📚"
                rows={10}
                className="w-full resize-y rounded-2xl border-2 border-peach bg-cream/50 p-4 text-gray-700 placeholder-gray-400 focus:border-amber transition-colors text-base leading-relaxed"
              />
              {error && (
                <p className="mt-3 text-coral text-sm font-semibold">{error}</p>
              )}
              <button
                onClick={generateQuiz}
                disabled={loading || notes.trim().length < 20}
                className="mt-5 w-full py-3.5 rounded-2xl bg-coral text-white font-bold text-lg hover:bg-coral/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating Quiz...
                  </span>
                ) : (
                  "Generate Quiz 🎯"
                )}
              </button>
            </div>
          </div>
        )}

        {state === "quiz" && (
          <div key={quizKey} className="animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-400">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="text-sm font-bold text-amber">
                {results.length > 0
                  ? `${results.reduce((s, r) => s + r.score, 0)} / ${results.length * 10} pts`
                  : ""}
              </span>
            </div>
            <div className="w-full h-3 bg-peach rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-gradient-to-r from-amber to-coral rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentIdx + (showGrade ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>

            <div className="bg-white rounded-3xl card-shadow p-6 md:p-8 animate-scale-in" key={`q-${currentIdx}`}>
              <div className="text-3xl mb-4">❓</div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 leading-snug mb-6">
                {questions[currentIdx]}
              </h2>

              {!showGrade ? (
                <>
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={4}
                    className="w-full resize-y rounded-2xl border-2 border-peach bg-cream/50 p-4 text-gray-700 placeholder-gray-400 focus:border-amber transition-colors text-base leading-relaxed"
                  />
                  {error && (
                    <p className="mt-3 text-coral text-sm font-semibold">{error}</p>
                  )}
                  <button
                    onClick={submitAnswer}
                    disabled={grading || !userAnswer.trim()}
                    className="mt-4 w-full py-3 rounded-2xl bg-sage text-white font-bold text-lg hover:bg-sage/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {grading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Grading...
                      </span>
                    ) : (
                      "Submit Answer ✍️"
                    )}
                  </button>
                </>
              ) : (
                <div className="animate-fade-in">
                  <div className="flex flex-col items-center mb-5">
                    <div className="relative w-32 h-32 mb-3">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                        <circle
                          cx="40" cy="40" r="35"
                          fill="none" stroke="#FFE8D6" strokeWidth="8"
                        />
                        <circle
                          ref={ringRef}
                          className="score-ring-circle"
                          cx="40" cy="40" r="35"
                          fill="none"
                          stroke={scoreColor(currentGrade?.score ?? 0)}
                          strokeWidth="8"
                          strokeLinecap="round"
                          style={{ strokeDashoffset: 251.2 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-extrabold" style={{ color: scoreColor(currentGrade?.score ?? 0) }}>
                          {currentGrade?.score}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-center font-semibold max-w-sm">
                      {currentGrade?.feedback}
                    </p>
                  </div>
                  <button
                    onClick={nextQuestion}
                    className="w-full py-3 rounded-2xl bg-coral text-white font-bold text-lg hover:bg-coral/90 active:scale-[0.98] transition-all"
                  >
                    {currentIdx + 1 >= questions.length ? "See Results 🏆" : "Next Question →"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {state === "results" && (
          <div className="animate-fade-in">
            {hasHighScores && (
              <div className="text-center mb-4 text-4xl animate-bounce select-none">🎉</div>
            )}
            <div className="bg-white rounded-3xl card-shadow p-6 md:p-8 text-center">
              <div className="text-5xl mb-3">
                {Number(avgScore) >= 8 ? "🌟" : Number(avgScore) >= 5 ? "💪" : "📖"}
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-1">
                Quiz Complete!
              </h2>
              <p className="text-gray-500 mb-6">
                You scored <span className="font-bold text-coral">{totalScore}</span> out of{" "}
                <span className="font-bold">{results.length * 10}</span> points
              </p>

              <div className="space-y-3 mb-8 text-left">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-cream/60 animate-fade-in"
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: scoreColor(r.score) }}
                    >
                      {r.score}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm leading-snug">
                        {r.question}
                      </p>
                      <p className="text-gray-400 text-xs mt-1 truncate">
                        Your answer: {r.answer}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5 italic">
                        {r.feedback}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={resetQuiz}
                className="w-full py-3.5 rounded-2xl bg-amber text-white font-bold text-lg hover:bg-amber/90 active:scale-[0.98] transition-all"
              >
                Try Again 🔄
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-10 text-center text-gray-400 text-sm">
        Built with 🦉 by SwotBot
      </footer>
    </div>
  )
}
