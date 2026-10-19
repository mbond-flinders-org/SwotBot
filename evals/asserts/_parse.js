// The model does not always return a bare JSON object. It may wrap it in a code
// fence, add a sentence either side, or — with reasoning models — emit more than
// one object. Take the FIRST complete object and ignore whatever follows.
//
// Scanning for the first balanced object matters: slicing from the first "{" to
// the last "}" swallows a second object and JSON.parse then fails with
// "Unexpected non-whitespace character after JSON".
function firstJsonValue(text, opener) {
  const closer = opener === "{" ? "}" : "]"
  const start = text.indexOf(opener)
  if (start === -1) return null

  let depth = 0, inString = false, escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escaped) { escaped = false; continue }
    if (inString) {
      if (ch === "\\") escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === opener) depth++
    else if (ch === closer && --depth === 0) return text.slice(start, i + 1)
  }
  return null
}

function parseGrade(output) {
  const cleaned = String(output).replace(/```json/g, "").replace(/```/g, "").trim()
  try { return JSON.parse(cleaned) } catch {}
  const candidate = firstJsonValue(cleaned, "{")
  if (candidate === null) throw new Error("no JSON object in the reply")
  return JSON.parse(candidate)
}

module.exports = { parseGrade, firstJsonValue }
