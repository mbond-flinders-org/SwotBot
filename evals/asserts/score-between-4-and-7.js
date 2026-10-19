const { parseGrade } = require("./_parse.js")

module.exports = (output) => {
  // A reply we cannot read is a failure, not a crash. The grader sometimes
  // returns the format template instead of a score, or more than one object.
  let s
  try { s = parseGrade(output).score } catch (e) {
    return { pass: false, score: 0, reason: `unusable reply (${e.message}): ${String(output).slice(0, 80)}` }
  }
  if (typeof s !== "number" || Number.isNaN(s)) {
    return { pass: false, score: 0, reason: `score was ${JSON.stringify(s)}, expected a number` }
  }
  const pass = s >= 4 && s <= 7
  return { pass, score: pass ? 1 : 0, reason: pass ? `scored ${s} — between 4 and 7` : `scored ${s} — expected between 4 and 7` }
}
