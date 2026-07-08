# KB-Creator

Turn structured notes (problem, symptoms, cause, resolution steps) into a formatted Knowledge Base article, using Claude to do the writing.

## Local development

```bash
npm install
cp .env.example .env.local   # then paste in your real ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

## Project layout

See `CLAUDE.md` for the full map. In short: `app/page.tsx` is the UI, `app/api/generate-kb/route.ts` is the only server-side code that calls the Anthropic API, and `lib/anthropic.ts` holds the system prompt that defines the article structure.

## Deploying

See the deployment walkthrough provided alongside this project for step-by-step Vercel instructions. In short: push to GitHub, import into Vercel, set the `ANTHROPIC_API_KEY` environment variable, deploy.
