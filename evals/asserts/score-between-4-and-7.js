const { parseGrade } = require("./_parse.js")

module.exports = (output) => {
  const s = parseGrade(output).score
  const pass = s >= 4 && s <= 7
  return { pass, score: pass ? 1 : 0, reason: pass ? `scored ${s} — between 4 and 7` : `scored ${s} — expected between 4 and 7` }
}
