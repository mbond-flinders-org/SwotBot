#!/usr/bin/env node
// Turn a promptfoo JSON result into one compact, landscape table.
//
//   npx promptfoo@latest eval --env-file ../.env --no-cache -j 1 --delay 13000 \
//       --filter-providers "temp 0.7$" -o last-run.json
//   node summarise.mjs last-run.json
//
// promptfoo's own table prints the model's full reasoning in every cell, which
// is useful when you are debugging and unreadable when you are presenting.
// This prints the pass, the fail and the score, and nothing else.

import { readFileSync } from "node:fs"

const file = process.argv[2] || "last-run.json"
const raw = JSON.parse(readFileSync(file, "utf8"))

// promptfoo has moved this around between versions, so look in a few places.
const rows =
  raw?.results?.results ?? raw?.results ?? raw?.evalRecord?.results ?? null

if (!Array.isArray(rows)) {
  console.error(`Could not find a results array in ${file}.`)
  console.error(`Top-level keys: ${Object.keys(raw).join(", ")}`)
  process.exit(1)
}

const pick = (...vals) => vals.find((v) => typeof v === "string" && v.length)

const scoreOf = (r) => {
  const out = r?.response?.output ?? r?.output
  if (out == null) return ""
  try {
    const o = typeof out === "string" ? JSON.parse(out) : out
    return Number.isFinite(o?.score) ? String(o.score) : ""
  } catch {
    return ""
  }
}

const cases = new Map()
const columns = []

for (const r of rows) {
  const desc =
    pick(r?.testCase?.description, r?.description, r?.test?.description) ||
    "(no description)"
  const col =
    pick(r?.prompt?.label, r?.promptLabel, r?.prompt?.id, r?.provider?.label) ||
    "result"
  if (!columns.includes(col)) columns.push(col)

  const pass = r?.success ?? r?.gradingResult?.pass ?? r?.pass
  if (!cases.has(desc)) cases.set(desc, {})
  cases.get(desc)[col] = { pass, score: scoreOf(r) }
}

const DESC_W = Math.min(
  46,
  Math.max(20, ...[...cases.keys()].map((d) => d.length))
)
const COL_W = 14
const trim = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s)
const pad = (s, n) => s.padEnd(n)

console.log()
console.log(`  ${pad("", DESC_W + 3)}${columns.map((c) => pad(trim(c, COL_W), COL_W)).join("")}`)
console.log(`  ${"─".repeat(DESC_W + 3 + COL_W * columns.length)}`)

let n = 0
const failed = Object.fromEntries(columns.map((c) => [c, 0]))

for (const [desc, byCol] of cases) {
  n += 1
  const cells = columns.map((c) => {
    const cell = byCol[c]
    if (!cell) return pad("--", COL_W)
    if (cell.pass === false) failed[c] += 1
    const verdict = cell.pass === true ? "PASS" : cell.pass === false ? "FAIL" : "?"
    return pad(cell.score ? `${verdict}  ${cell.score}/10` : verdict, COL_W)
  })
  console.log(`  ${String(n).padStart(2)}  ${pad(trim(desc, DESC_W), DESC_W + 1)}${cells.join("")}`)
}

console.log()
for (const c of columns) {
  const f = failed[c]
  console.log(`  ${pad(trim(c, DESC_W + 3), DESC_W + 3)}${f} of ${n} failed`)
}
console.log()
