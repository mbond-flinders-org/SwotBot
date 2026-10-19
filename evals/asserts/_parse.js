// The model sometimes wraps its JSON in a code fence or a friendly sentence.
// The app copes with that, so the evals have to as well.
function parseGrade(output) {
  const cleaned = String(output).replace(/```json/g, "").replace(/```/g, "").trim()
  try { return JSON.parse(cleaned) } catch {}
  const start = cleaned.indexOf("{"), end = cleaned.lastIndexOf("}")
  if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1))
  throw new Error("no JSON object in the reply")
}
module.exports = { parseGrade }
