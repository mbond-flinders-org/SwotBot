#!/usr/bin/env node
// Turn a promptfoo JSON result into one compact, landscape table.
//
//   npx promptfoo@latest eval --env-file ../.env --no-cache -j 1 --delay 13000 \
//       --filter-providers "temp 0.7$" -o last-run.json
//   node summarise.mjs last-run.json
//
// promptfoo's own table prints the model's full reasoning in every cell, which
// is useful when you are debugging and unreadable when you are presenting.
// This prints the verdict and the score, and nothing else.

import { readFileSync } from "node:fs"

const file = process.argv[2] || "last-run.json"
const WRAP = Number(process.argv[3]) || 44   // description width, in characters

const raw = JSON.parse(readFileSync(file, "utf8"))
const rows = raw?.results?.results ?? raw?.results ?? null

if (!Array.isArray(rows)) {
  console.error(`Could not find a results array in ${file}.`)
  console.error(`Top-level keys: ${Object.keys(raw).join(", ")}`)
  process.exit(1)
}

const pick = (...v) => v.find((x) => typeof x === "string" && x.length)

// The grader replies with its reasoning first and the JSON last, so take the
// last {...} in the reply that actually parses and carries a score.
const scoreOf = (r) => {
  const out = r?.response?.output ?? r?.output
  if (out && typeof out === "object") {
    return Number.isFinite(out.score) ? String(out.score) : ""
  }
  if (typeof out !== "string") return ""
  const candidates = [...out.matchAll(/\{[^{}]*"score"[^{}]*\}/g)]
  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const o = JSON.parse(candidates[i][0])
      if (Number.isFinite(o?.score)) return String(o.score)
    } catch {}
  }
  return ""
}

// Why a case failed, in a few words. A red cell is not self-explanatory: a case
// can fail because the grader was wrong, or because the reply would not parse,
// and those are different bugs with different fixes.
const shortReason = (r) => {
  if (r?.success !== false) return ""
  const reason = pick(r?.gradingResult?.reason, r?.failureReason, "") || ""
  if (/unusable reply|is not valid JSON|Unexpected token/i.test(reason))
    return "UNPARSEABLE"
  const first = reason.split("\n")[0].replace(/\s+/g, " ").trim()
  return first.length > 58 ? first.slice(0, 57) + "\u2026" : first || "assertion failed"
}

// Columns keep the order the config declares them in, via promptIdx, so
// "before" stays left of "after" however the runner finishes them.
const cases = new Map()
const colIdx = new Map()

for (const r of rows) {
  const desc = pick(r?.testCase?.description, r?.description) || "(no description)"
  const col = pick(r?.prompt?.label, r?.promptLabel, r?.provider?.label) || "result"
  if (!colIdx.has(col)) colIdx.set(col, r?.promptIdx ?? colIdx.size)
  if (!cases.has(desc)) cases.set(desc, {})
  cases.get(desc)[col] = {
    pass: r?.success ?? r?.gradingResult?.pass,
    score: scoreOf(r),
    why: shortReason(r),
  }
}

const columns = [...colIdx.keys()].sort((a, b) => colIdx.get(a) - colIdx.get(b))

// "hardened (shipping)" -> two header lines, rather than one cut off mid-word.
const splitLabel = (s) => {
  const i = s.indexOf(" (")
  return i === -1 ? [s, ""] : [s.slice(0, i), s.slice(i + 1)]
}

// Wrap rather than truncate: a long case name costs a line, not its ending.
const wrap = (s, n) => {
  const out = []
  let line = ""
  for (const word of s.split(/\s+/)) {
    if (line && (line + " " + word).length > n) {
      out.push(line)
      line = word
    } else {
      line = line ? line + " " + word : word
    }
  }
  if (line) out.push(line)
  return out
}

const COL_W = Math.max(13, ...columns.flatMap((c) => splitLabel(c).map((p) => p.length + 3)))
const pad = (s, n) => s.padEnd(n)
const GUTTER = WRAP + 6

console.log()
for (const line of [0, 1]) {
  const heads = columns.map((c) => pad(splitLabel(c)[line], COL_W)).join("")
  if (heads.trim()) console.log(" ".repeat(GUTTER) + heads.trimEnd())
}
console.log("  " + "─".repeat(GUTTER + COL_W * columns.length - 4))

let n = 0
const failed = Object.fromEntries(columns.map((c) => [c, 0]))

for (const [desc, byCol] of cases) {
  n += 1
  const cells = columns.map((c) => {
    const cell = byCol[c]
    if (!cell) return pad("--", COL_W)
    if (cell.pass === false) failed[c] += 1
    // A reply the app can't read is a different failure from a mark that's
    // wrong. Showing "FAIL 0/10" for the first one reads as a contradiction:
    // the mark was fine, the reply was not.
    if (cell.why === "UNPARSEABLE") return pad("UNREADABLE", COL_W)
    const verdict = cell.pass === true ? "PASS" : cell.pass === false ? "FAIL" : "?"
    return pad(cell.score ? `${verdict} ${cell.score.padStart(2)}/10` : verdict, COL_W)
  })
  const lines = wrap(desc, WRAP)
  console.log(`  ${String(n).padStart(2)}  ${pad(lines[0], WRAP + 2)}${cells.join("").trimEnd()}`)
  for (const extra of lines.slice(1)) console.log(" ".repeat(6) + extra)
  for (const c of columns) {
    const cell = byCol[c]
    if (cell?.pass === false && cell.why) {
      const note =
        cell.why === "UNPARSEABLE"
          ? `the app could not read the reply` +
            (cell.score ? ` (the mark inside it was ${cell.score}/10)` : "")
          : cell.why
      console.log(" ".repeat(6) + `\u21b3 ${splitLabel(c)[0]}: ${note}`)
    }
  }
}

console.log()
for (const c of columns) {
  console.log(`  ${pad(c, GUTTER - 2)}${failed[c]} of ${n} failed`)
}
console.log()
