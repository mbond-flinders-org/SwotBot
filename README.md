# SwotBot

Paste your study notes. SwotBot writes quiz questions from them, marks your
answers, and gives you feedback.

## Stack

- Next.js 14 + React 18
- TypeScript + Tailwind CSS
- Groq API (GPT-OSS 120B)

## Setup

```bash
npm install
```

Create a `.env` file:

```
GROQ_API_KEY=your_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

`GROQ_API_KEY` is free. Get one at [console.groq.com/keys](https://console.groq.com/keys).

`GROQ_MODEL` chooses the model. Models get retired, so this one may stop working
one day. If you see a 404, or "model not found", pick a current model ID from
[console.groq.com/docs/models](https://console.groq.com/docs/models) and put it
here. You do not need to change any code.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build and run

```bash
npm run build
npm start
```

## Does it work?

It runs. That is not the same thing.

- `BREAK-IT.md` — six ways to break this app, and what to look for
- `evals/` — the eval suite that catches those problems automatically
- `prompts/` — the grading prompts, so you can swap one in and measure the difference
- `vary.mjs` — run one prompt many times and see the spread of answers
