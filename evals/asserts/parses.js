const { parseGrade } = require("./_parse.js")

module.exports = (output) => {
  let g
  try { g = parseGrade(output) } catch (e) {
    return { pass: false, score: 0, reason: `reply was not usable JSON (${e.message}): ${String(output).slice(0, 80)}` }
  }
  if (typeof g.score !== "number" || g.score < 0 || g.score > 10) {
    return { pass: false, score: 0, reason: `score was ${JSON.stringify(g.score)}, expected a number 0-10` }
  }
  return { pass: true, score: 1, reason: "reply parsed, score in range" }
}
