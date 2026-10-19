# SwotBot

Paste your study notes. SwotBot writes quiz questions from them, marks your
answers, and gives you feedback.

## Which version is this?

This repo follows a video series, and each video has a release. Pick the one that
matches where you are.

| release | what it is |
|---|---|
| [`v1`](../../releases/tag/v1) | the app at the end of video 1. Built in about ten minutes with an AI agent, then deployed. It works. Nobody checked it. |
| [`v2`](../../releases/tag/v2) | the app at the end of video 2. Same app, plus the tools that test it, and a fix for one real bug. |
| `main` | wherever the series has got to. May be ahead of both. |

To start from a particular one:

```bash
git clone --branch v1 https://github.com/mbond-flinders-org/SwotBot.git
```

The running app shows which build it is in the footer. That matters here, because
the grading prompt changed between v1 and v2 — the same URL can mark your answer
differently depending on what is deployed.

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

It runs. That is not the same thing. These arrive in `v2`:

- `BREAK-IT.md` — six ways to break this app, and what to look for
- `evals/` — the eval suite that catches those problems automatically
- `prompts/` — the grading prompts, so you can swap one in and measure the difference
- `vary.mjs` — run one prompt many times and see the spread of answers
