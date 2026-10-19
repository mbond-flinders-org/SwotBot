const { parseGrade } = require("./_parse.js")

module.exports = (output) => {
  const s = parseGrade(output).score
  const pass = s <= 4
  return { pass, score: pass ? 1 : 0, reason: pass ? `scored ${s} — 4 or less` : `scored ${s} — expected 4 or less` }
}
