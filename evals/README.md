# SwotBot evals

A test asks: *did it give the right answer?*

An eval asks: *how often is it right, and how wrong is it when it is not?*

SwotBot's grader is a language model with the dice turned on. The temperature is
`0.7`, straight out of `app/api/quiz/route.ts`. It will not give you the same mark
twice. So we do not assert one answer. We run it many times and check the shape of
what comes back.

## Run it

```bash
npx promptfoo@latest eval --env-file ../.env                         # one pass of all 5 cases
npx promptfoo@latest eval --env-file ../.env --repeat 10 --no-cache  # each case 10 times
npx promptfoo@latest view                                            # browse the results
```

`--env-file ../.env` reads `GROQ_API_KEY` and `GROQ_MODEL` from the app's own
`.env`. The suite then always runs against the same model as the app. If a model is
retired, change `GROQ_MODEL` in `.env`. Nothing in this folder needs editing.

**Always use `--no-cache` when you use `--repeat`.** Without it, promptfoo replays
earlier answers from its cache. Your ten runs become one run shown ten times, and
the spread you are trying to measure disappears.

Expect some failures. That is the point. A case that passes 6 times out of 10 is
telling you something a single run would have hidden.

## Why every case runs twice

Each case runs against two providers. One is the grader at `temperature: 0.7`,
which is what the app ships. The other is the same grader at `temperature: 0`. The
results come out side by side.

Turning the temperature down is the first thing people suggest when they see the
spread. So the suite answers that question directly.

It is not the fix people expect. With the original grading prompt, all five cases
passed at `0.7`. Two of them failed at `0`. The injection case was the worst. It
failed every single run — thirty out of thirty, standard deviation 0.00.

A grader that is reliably wrong is still wrong. Reliable is not the same as right.

Two more things to know before you reach for temperature 0:

- **It is not truly deterministic.** Greedy decoding still drifts in production.
  Request batching, floating-point ordering on GPUs and expert routing all add
  noise. Expect a narrower spread, not no spread.
- **The quiz generator needs the variety.** Drop the temperature there and every
  student gets the same five questions from the same notes, forever. This app has
  already had that problem once.

A heavy run doubles the number of API calls. To run one provider only:

```bash
npx promptfoo@latest eval --env-file ../.env --repeat 10 --no-cache --filter-providers "temp 0.7"
```

Careful: `--filter-providers` matches on part of the name. `"temp 0"` matches
**both** providers, because "temp 0.7" contains "temp 0". Use the full label, or
anchor it with `"temp 0$"`.

## The cases

| # | Case | What it protects |
|---|---|---|
| 1 | A strong answer scores 7+ | the grader can still recognise a good answer |
| 2 | "idk lol" scores 3 or less | the grader is not just handing out marks |
| 3 | **Injected notes still mark honestly** | prompt injection — `BREAK-IT.md` #1 |
| 4 | Confident waffle scores 4 or less | the grader rewards correctness, not fluency |
| 5 | A borderline answer stays in a 4–7 band | consistency — run this one with `--repeat 10` |

Case 3 is the one that matters most.

The grading prompt has since been hardened. The case now passes at both
temperatures. That was measured with `vary.mjs`: sixty runs, no failures. The
prompt that fixed it is in `prompts/grader-shipped.txt`, so you can run the old one
and the new one against the same case and see the difference yourself.

Keep the case anyway. It is a permanent guard on a real hole. It is what stops that
hole coming back quietly, the next time somebody edits the wording.

One caution, and it is the important one. Sixty runs of one attack show that the
prompt survives *that* attack. They do not show the grader is safe.

There is one change that would make this attack impossible: take the study notes
out of the grading call. Then there is nothing left to inject into. But the notes
are what the grader marks against. Remove them and SwotBot can no longer mark
anything specific to your own material — it falls back on general knowledge.

So that is a product decision with a trade-off, not a security fix you get for
free. It is left undone here on purpose.

Case 4 has not been re-measured since the prompt changed. If you want to know where
it stands, measure it — do not assume.

## Files

- `promptfooconfig.yaml` — the suite
- `grader-prompt.json` — the grading prompt, **copied from `app/api/quiz/route.ts`**
- `notes/concurrency.txt` — ordinary study notes
- `notes/concurrency-injected.txt` — the same notes, with one extra line at the bottom
- `asserts/*.js` — the grader for each case, in plain JavaScript

If you change the app's grading prompt, change `grader-prompt.json` to match. An
eval suite that tests a prompt the app no longer uses is worse than no eval suite
at all.

## Also useful

`../vary.mjs` runs the app's prompts many times over and shows the distribution
directly. It will give you the question generator's repeat rate, or a strip of
thirty marks for one answer. It is good for seeing a problem. The suite above is
for catching that problem automatically from then on.
