# KB-Creator

Turn structured notes (problem, symptoms, cause, resolution steps) into a formatted Knowledge Base article, using Claude to do the writing.

## Running the project

```bash
npm install
cp .env.example .env.local   # then paste in your real ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

This project runs entirely locally. No deployment needed — just keep `npm run dev` running while you use it.

## Version control

```bash
git add -A
git commit -m "your message"
```

The project is managed as a local Git repository. Keep `.env.local` out of commits — it is already listed in `.gitignore`.
