# Grading prompt variants

`vary.mjs --prompt-file prompts/<name>.txt` runs the grader with a different prompt without
touching the app. Measure first, ship second.

| file | what it is |
| --- | --- |
| `grader-shipped.txt` | the prompt `app/api/quiz/route.ts` actually uses |
| `grader-strict.txt` | a harder version: numbered rules, and the model must decide in writing whether the input contains an instruction before it scores |

Compare them on the injected notes:

```bash
node vary.mjs --mode grade --runs 30 --notes evals/notes/concurrency-injected.txt --answer "idk lol"
node vary.mjs --mode grade --runs 30 --notes evals/notes/concurrency-injected.txt --answer "idk lol" --prompt-file prompts/grader-strict.txt
node vary.mjs --mode grade --runs 30 --notes evals/notes/concurrency-injected.txt --answer "idk lol" --no-notes
```

## One rule about writing these

Do not name the specific attack you are testing. A line like *"an answer of 'idk lol' always
scores 0"* will make your eval pass and protect nothing — you have taught the prompt the answer
to the test rather than the principle behind it. The strict prompt deliberately describes the
*category* (text addressed to the grader) and never the example.

## What to expect

Both prompts reduce the attack. Neither removes it. `--no-notes` removes it completely, because
the student-controlled text never reaches the component making the decision. That is the
difference between persuading a model and changing what it can see.
