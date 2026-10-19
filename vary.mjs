#!/usr/bin/env node
/**
 * SwotBot — variation checker
 *
 * Runs SwotBot's OWN prompts against the same study notes, many times over,
 * and shows you what actually comes back. No clicking through the app.
 *
 *   node vary.mjs                          # 10 runs of the quiz generator
 *   node vary.mjs --runs 20                # more runs
 *   node vary.mjs --temperature 0          # turn the dice off and compare
 *   node vary.mjs --notes my-notes.txt
 *   node vary.mjs --show                   # print every run's questions
 *
 *   node vary.mjs --mode grade             # 10 runs of the grader on one answer
 *   node vary.mjs --mode grade --answer "it lets things happen at once"
 *
 * Needs GROQ_API_KEY — from .env in this folder, or the environment.
 * Node 18+ (uses built-in fetch). No npm install.
 */

import { readFileSync, existsSync } from "node:fs"

// ---------------------------------------------------------------------------
// These two prompts are copied verbatim from app/api/quiz/route.ts.
// If you change the app's prompts, change them here too — the whole point is
// that this script tests the same thing the app does.
// ---------------------------------------------------------------------------
const GENERATE_PROMPT = `You are a friendly study quiz maker called SwotBot. Given the student's study notes, generate exactly 5 short-answer quiz questions that test understanding of the material. Return ONLY a valid JSON array of 5 strings, with no extra text, no markdown, no code fences. Example: ["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]`

const GRADE_PROMPT = `You are a warm, encouraging grading assistant. Grade the student's answer on a scale of 0 to 10 based on correctness and completeness. Return ONLY valid JSON: {"score": <number 0-10>, "feedback": "<one encouraging sentence>"}. No extra text, no markdown, no code fences.`

const GROQ_URL = process.env.GROQ_URL || "https://api.groq.com/openai/v1/chat/completions"
const model = () => process.env.GROQ_MODEL || "openai/gpt-oss-120b"

// A deliberately mid-quality answer. Borderline answers vary the most —
// a perfect answer and a blank one both grade consistently.
const DEFAULT_QUESTION = "What is the difference between concurrency and parallelism?"
const DEFAULT_ANSWER = "Concurrency is doing lots of things at once. Parallelism is similar but uses more than one core."

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const a = {
    runs: 10, mode: "generate", notes: "Study-Notes-Concurrency.txt",
    temperature: 0.7, concurrency: 3, show: false,
    question: DEFAULT_QUESTION, answer: DEFAULT_ANSWER,
  }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (k === "--show") { a.show = true; continue }
    const v = argv[++i]
    if (k === "--runs") a.runs = Number(v)
    else if (k === "--mode") a.mode = v
    else if (k === "--notes") a.notes = v
    else if (k === "--temperature") a.temperature = Number(v)
    else if (k === "--concurrency") a.concurrency = Number(v)
    else if (k === "--question") a.question = v
    else if (k === "--answer") a.answer = v
    else { console.error(`Unknown option: ${k}`); process.exit(1) }
  }
  if (!Number.isFinite(a.runs) || a.runs < 1) { console.error("--runs must be a positive number"); process.exit(1) }
  if (!Number.isFinite(a.temperature)) { console.error("--temperature must be a number"); process.exit(1) }
  if (a.mode !== "generate" && a.mode !== "grade") { console.error('--mode must be "generate" or "grade"'); process.exit(1) }
  return a
}

// Read .env into process.env (without overwriting anything already set there),
// so GROQ_API_KEY and GROQ_MODEL can live in one file next to the app.
function loadEnv(file = ".env") {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i)
    if (!m) continue
    const value = m[2].trim().replace(/^["']|["']$/g, "")
    if (value && process.env[m[1]] === undefined) process.env[m[1]] = value
  }
}

function requireKey() {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY
  console.error("No GROQ_API_KEY found. Copy .env.example to .env and put your key in it.")
  process.exit(1)
}

// ---------------------------------------------------------------------------
// the one API call, same shape as the app's
// ---------------------------------------------------------------------------
async function groqChat(key, systemPrompt, userMessage, temperature) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: model(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature,
      max_tokens: 1024,
    }),
  })
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.choices[0].message.content.trim()
}

// The app is forgiving about how the model wraps its JSON. So are we.
export function extractJson(raw, open, close) {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  try { return JSON.parse(cleaned) } catch {}
  const start = cleaned.indexOf(open), end = cleaned.lastIndexOf(close)
  if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1))
  throw new Error("could not parse JSON from the model's reply")
}

// ---------------------------------------------------------------------------
// grouping near-duplicate questions
//
// "What is a critical section?" and "What is a critical section and why does
// it matter?" are the same question wearing a different hat. Exact matching
// would call them different and flatter the model, so we compare the words
// they use and group anything that overlaps a lot.
// ---------------------------------------------------------------------------
const STOP = new Set(["the","a","an","is","are","of","in","to","and","or","what","how","why","does","do","it","its","that","this","for","be","can","you","your","with","on","as","by","at","from","between","two","main"])

export function tokens(q) {
  return new Set(
    String(q).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w))
  )
}

export function similarity(a, b) {
  if (!a.size || !b.size) return 0
  let shared = 0
  for (const w of a) if (b.has(w)) shared++
  return shared / (a.size + b.size - shared)   // Jaccard
}

export function groupQuestions(runs, threshold = 0.5) {
  const groups = []   // { label, tokens, runsSeen:Set, variants:Set }
  runs.forEach((questions, runIndex) => {
    for (const q of questions) {
      const t = tokens(q)
      let best = null, bestScore = threshold
      for (const g of groups) {
        const s = similarity(t, g.tokens)
        if (s >= bestScore) { best = g; bestScore = s }
      }
      if (best) { best.runsSeen.add(runIndex); best.variants.add(q) }
      else groups.push({ label: q, tokens: t, runsSeen: new Set([runIndex]), variants: new Set([q]) })
    }
  })
  return groups.sort((a, b) => b.runsSeen.size - a.runsSeen.size)
}

export function scoreStats(scores) {
  const n = scores.length
  if (!n) return { n: 0 }
  const sorted = [...scores].sort((x, y) => x - y)
  const mean = scores.reduce((s, x) => s + x, 0) / n
  const sd = Math.sqrt(scores.reduce((s, x) => s + (x - mean) ** 2, 0) / n)
  return { n, min: sorted[0], max: sorted[n - 1], mean, sd, spread: sorted[n - 1] - sorted[0] }
}

// ---------------------------------------------------------------------------
// running N of them without hammering the free tier
// ---------------------------------------------------------------------------
async function pool(count, limit, worker) {
  const results = new Array(count)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, count) }, async () => {
    while (next < count) {
      const i = next++
      try { results[i] = { ok: true, value: await worker(i) } }
      catch (err) { results[i] = { ok: false, error: err.message } }
      process.stderr.write(".")
    }
  }))
  process.stderr.write("\n")
  return results
}

// ---------------------------------------------------------------------------
// output
// ---------------------------------------------------------------------------
const BOLD = "\x1b[1m", DIM = "\x1b[2m", OFF = "\x1b[0m"
const bar = (n, total, width = 20) => "█".repeat(Math.round((n / total) * width)).padEnd(width, "·")

function header(args, extra) {
  console.log(`\n${BOLD}SwotBot — ${args.mode === "generate" ? "question" : "grading"} variation${OFF}`)
  console.log(`${DIM}model ${model()}   temperature ${args.temperature}   runs ${args.runs}${OFF}`)
  console.log(`${DIM}${extra}${OFF}\n`)
}

async function runGenerate(key, args, notes) {
  header(args, `notes: ${args.notes} (${notes.length.toLocaleString()} characters)`)
  const results = await pool(args.runs, args.concurrency, async () => {
    const raw = await groqChat(key, GENERATE_PROMPT, `Study notes:\n\n${notes}`, args.temperature)
    const qs = extractJson(raw, "[", "]")
    if (!Array.isArray(qs)) throw new Error("model did not return an array")
    return qs.slice(0, 5).map(String)
  })

  const ok = results.filter(r => r.ok).map(r => r.value)
  const failed = results.length - ok.length
  if (!ok.length) { console.error("Every run failed. Last error:", results[results.length - 1]?.error); process.exit(1) }

  if (args.show) {
    ok.forEach((qs, i) => {
      console.log(`${BOLD}run ${String(i + 1).padStart(2)}${OFF}`)
      qs.forEach(q => console.log(`   ${q}`))
      console.log()
    })
  }

  const groups = groupQuestions(ok)
  console.log(`${BOLD}HOW OFTEN EACH QUESTION CAME BACK${OFF}  ${DIM}(near-duplicates grouped)${OFF}\n`)
  for (const g of groups) {
    const n = g.runsSeen.size
    const pct = `${String(n).padStart(2)}/${ok.length}`
    console.log(`  ${pct}  ${bar(n, ok.length)}  ${g.label}`)
    if (g.variants.size > 1) console.log(`${DIM}          ${g.variants.size} wordings of this question${OFF}`)
  }

  const asked = ok.flat().length
  const everyRun = groups.filter(g => g.runsSeen.size === ok.length).length
  const onceOnly = groups.filter(g => g.runsSeen.size === 1).length
  const repeatRate = 100 * (1 - groups.length / asked)

  console.log(`\n${BOLD}SUMMARY${OFF}`)
  console.log(`  ${asked} questions asked across ${ok.length} runs`)
  console.log(`  ${groups.length} distinct questions  —  repeat rate ${repeatRate.toFixed(0)}%`)
  console.log(`  ${everyRun} turned up in every single run`)
  console.log(`  ${onceOnly} turned up exactly once`)
  if (failed) console.log(`  ${DIM}${failed} run(s) failed${OFF}`)
  console.log(`\n${DIM}Low distinct count + high repeat rate = the notes are barely being read.${OFF}\n`)
}

async function runGrade(key, args, notes) {
  header(args, `question: ${args.question}\nanswer:   "${args.answer}"`)
  const results = await pool(args.runs, args.concurrency, async () => {
    const userMsg = `Study notes for reference:\n${notes || "(none)"}\n\nQuestion: ${args.question}\n\nStudent's answer: ${args.answer}`
    const raw = await groqChat(key, GRADE_PROMPT, userMsg, args.temperature)
    const r = extractJson(raw, "{", "}")
    return { score: Math.max(0, Math.min(10, Math.round(Number(r.score)))), feedback: String(r.feedback ?? "") }
  })

  const ok = results.filter(r => r.ok).map(r => r.value)
  if (!ok.length) { console.error("Every run failed. Last error:", results[results.length - 1]?.error); process.exit(1) }

  console.log(`${BOLD}SCORES${OFF}\n`)
  ok.forEach((r, i) => {
    console.log(`  run ${String(i + 1).padStart(2)}   ${BOLD}${String(r.score).padStart(2)}${OFF}/10   ${bar(r.score, 10, 10)}`)
    if (args.show) console.log(`${DIM}            ${r.feedback}${OFF}`)
  })

  const s = scoreStats(ok.map(r => r.score))
  console.log(`\n  ${BOLD}${ok.map(r => r.score).join("  ")}${OFF}\n`)
  console.log(`${BOLD}SUMMARY${OFF}`)
  console.log(`  lowest ${s.min}   highest ${s.max}   spread ${s.spread} marks`)
  console.log(`  mean ${s.mean.toFixed(1)}   standard deviation ${s.sd.toFixed(2)}`)
  console.log(`\n${DIM}Same answer. Same marker. ${s.spread === 0 ? "No spread this time — try a more borderline answer." : `${s.spread} marks between best and worst.`}${OFF}\n`)
}

// ---------------------------------------------------------------------------
async function main() {
  loadEnv()
  const args = parseArgs(process.argv.slice(2))
  if (!existsSync(args.notes)) { console.error(`Can't find notes file: ${args.notes}`); process.exit(1) }
  const notes = readFileSync(args.notes, "utf8")
  const key = requireKey()
  if (args.mode === "generate") await runGenerate(key, args, notes)
  else await runGrade(key, args, notes)
}

// only run when invoked directly, so the helpers above can be unit-tested
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  main().catch(err => { console.error("\n" + err.message); process.exit(1) })
}
