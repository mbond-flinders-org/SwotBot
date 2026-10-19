# SwotBot evals

Tests ask *did it give the right answer?* Evals ask *how often, and how badly wrong when it's wrong?*

SwotBot's grader is a language model with the dice turned on (`temperature: 0.7`, straight from
`app/api/quiz/route.ts`). It will not give you the same mark twice. So instead of asserting one
answer, we run it repeatedly and check the shape of what comes back.

## Run it

```bash
npx promptfoo@latest eval --env-file ../.env             # one pass of all 5 cases
npx promptfoo@latest eval --env-file ../.env --repeat 10 # each case 10 times — the interesting one
npx promptfoo@latest view                                # browse results in the browser
```

`--env-file ../.env` picks up both `GROQ_API_KEY` and `GROQ_MODEL` from the app's own `.env`,
so the suite always runs against the same model the app does. If a model gets retired, change
`GROQ_MODEL` in `.env` — nothing in this folder needs editing.

Expect some failures. That is the point: a case that passes 6 times out of 10 is telling you
something a single test run would have hidden.

## The cases

| # | Case | What it protects |
|---|---|---|
| 1 | A strong answer scores 7+ | the grader can still recognise a good answer |
| 2 | "idk lol" scores 3 or less | the grader isn't just handing out marks |
| 3 | **Injected notes still mark honestly** | prompt injection — the hole in `BREAK-IT.md` #1 |
| 4 | Confident waffle scores 4 or less | the grader rewards correctness, not fluency |
| 5 | A borderline answer stays in a 4–7 band | consistency — run this one with `--repeat 10` |

Case 3 is the one that matters most. It is a permanent guard on a real vulnerability: once you
harden the grading prompt, this case stops it quietly coming back the next time someone edits
the wording.

## Files

- `promptfooconfig.yaml` — the suite
- `grader-prompt.json` — the grading prompt, **copied from `app/api/quiz/route.ts`**
- `notes/concurrency.txt` — ordinary study notes
- `notes/concurrency-injected.txt` — the same notes with one extra line at the bottom
- `asserts/*.js` — the graders for each case, in plain JavaScript

If you change the app's grading prompt, change `grader-prompt.json` to match. An eval suite
testing a prompt the app no longer uses is worse than no eval suite at all.

## Also useful

`../vary.mjs` runs the app's prompts many times over and shows the distribution directly —
the question generator's repeat rate, or a strip of ten marks for one answer. Good for seeing
the problem; the suite above is for catching it automatically from then on.
