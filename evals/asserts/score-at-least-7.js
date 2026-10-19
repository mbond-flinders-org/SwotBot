const { parseGrade } = require("./_parse.js")

module.exports = (output) => {
  const s = parseGrade(output).score
  const pass = s >= 7
  return { pass, score: pass ? 1 : 0, reason: pass ? `scored ${s} — 7 or more` : `scored ${s} — expected 7 or more` }
}
