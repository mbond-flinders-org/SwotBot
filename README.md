# SwotBot

AI-powered study quiz app. Paste your notes, answer generated questions, and get instant feedback.

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

`GROQ_API_KEY` is free from [console.groq.com/keys](https://console.groq.com/keys).

`GROQ_MODEL` picks the model. If you get a 404 or "model not found", a model has been
retired — change this to a current ID from
[console.groq.com/docs/models](https://console.groq.com/docs/models).

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build & Run

```bash
npm run build
npm start
```
