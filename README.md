# AI Teacher

AI Teacher is an adaptive educator that teaches from a topic or uploaded study material. It follows **Understand → Plan → Explain → Demonstrate → Question → Evaluate → Adapt → Continue**, rather than behaving as a one-shot chatbot.

## What it demonstrates

- Personalised lesson plans: level, objective, teaching style, time, depth, and language.
- PDF, DOCX, PPTX, TXT, and Markdown learning material uploads.
- RAG grounding: parse → chunk → retrieve relevant source material → display section citations.
- Persistent Supabase/PostgreSQL lesson sessions and resume after refresh.
- Questions, answer evaluation, misconception-aware re-teaching, and retries.
- Final learning report: score, strong concepts, revision needs, recommendation, and next topic.
- Anonymous per-browser learner profile and cross-lesson concept mastery.
- Animated AI teacher presenter with browser voice, replay/stop, and English/Hindi/Hinglish choices.
- Subject-aware visual instructions: diagrams, steps, examples, equations, tables, and blackboards.

## Architecture

```text
Topic or document + learner profile
  ├─ Upload: extract → chunks → retrieval → citations
  └─ Teaching provider: structured lesson plan
                           ↓
  Persistent lesson/session/answers → presenter + visual + question
                           ↓
       evaluation → adaptation → report → mastery profile
```

## AI/provider disclosure

- `TeachingModelProvider` abstracts generation, answer evaluation, and adaptation.
- `MockTeachingProvider` is deterministic for reliable local testing/demo.
- `ClaudeTeachingProvider` is used automatically when `ANTHROPIC_API_KEY` is configured server-side.
- Browser `SpeechSynthesis` provides key-free voice playback. A provider TTS/avatar can be substituted behind the presenter component.
- Retrieval is transparent lexical retrieval; its contract can be replaced with pgvector embeddings later.

## Setup

Create `.env` (do not commit it):

```dotenv
DATABASE_URL="your Supabase/PostgreSQL runtime connection"
DIRECT_URL="your direct migration connection"
ANTHROPIC_API_KEY="" # optional, server-side only
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

```bash
npm install
npm exec prisma generate
npm run dev
```

Open `http://localhost:3000/classroom`. For a new database, apply the SQL migrations in `prisma/migrations` through Supabase SQL Editor.

## Demo script (3–5 minutes)

1. Select Hindi/Hinglish, a beginner level, 15 minutes, and an objective.
2. Upload PDF/notes and show the source-chunk confirmation.
3. Generate the lesson. Show the AI teacher, **Hear teacher** voice, and subject visual.
4. Show **Grounded in your material** citations.
5. Submit an incorrect checkpoint answer to show constructive adaptation, then retry.
6. Complete the lesson and show score, revision advice, suggested next topic, and progress bars.
7. Refresh during a lesson to demonstrate persistent resume state.

## Verify

```bash
npm test
npm run lint
npm run build
```

## Honest limitations

Browser voice availability depends on installed device voices. The presenter is an animated in-app avatar, not a rendered third-party video. Configure a real LLM key for fully generative multilingual prose.

## Launch readiness

- Public pages: home, FAQ, About, Contact, Waitlist, Thank-you, and a custom 404 page.
- SEO: unique page titles/descriptions, `robots.txt`, `sitemap.xml`, and a site favicon.
- Privacy: cookie notice explains essential local storage. Analytics are intentionally not enabled until you select a provider and update the notice.
- Security headers: nosniff, frame denial, strict referrer policy, and restrictive browser permissions are set in `next.config.ts`.
- Honest social proof: no testimonials are displayed until you have real user permission and quotes.

## Deploy to Vercel

1. Create a GitHub repository and push this project. Never commit `.env`.
2. Import that repository at [Vercel](https://vercel.com/new). Vercel provides HTTPS/TLS for the deployed domain.
3. Add `DATABASE_URL`, `DIRECT_URL`, and any optional provider variables in **Project Settings → Environment Variables**. Do not add secret values with `NEXT_PUBLIC_` prefixes.
4. Set `NEXT_PUBLIC_SITE_URL` to the resulting `https://...vercel.app` URL (or your custom domain), then redeploy.
5. In Supabase SQL Editor, apply the migration files under `prisma/migrations` before the first production lesson.
6. Run the demo checklist above on the public URL.

### Before enabling a public waitlist or analytics

The current waitlist is deliberately a local demo only; it does not transmit email addresses. Connect a consented form/database provider before collecting real registrations. Likewise, choose an analytics provider, add its script only after consent, and update the cookie notice and privacy policy.
