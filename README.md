# CodeCompass — Socratic AI Code Tutor

CodeCompass is a free, open-source educational MVP that helps students learn programming through guided discovery. Instead of giving answers, it asks Socratic questions, provides progressive hints, and lets you run code directly in the browser.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router, static export), React 18, TypeScript, Tailwind CSS |
| Code editor | Monaco Editor (browser-only dynamic import) |
| Streaming chat | Vercel AI SDK 5 (`@ai-sdk/react` + `TextStreamChatTransport`) |
| Backend | Node.js + Express + TypeScript |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL + Prisma ORM |
| Rate limiting | Upstash Redis |
| AI provider | OpenRouter (model configurable via `OPENROUTER_MODEL`) |
| Code execution | Judge0 (isolated sandbox — code never runs on the Express server) |
| Frontend hosting | GitHub Pages (static export) |
| Backend hosting | Railway |

---

## Project structure

```
codecompass/
├── backend/                 Express + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── index.ts         Entry point
│   │   ├── lib/             prisma, supabase, rateLimiter, env
│   │   ├── middleware/      requireAuth (JWT verification)
│   │   └── routes/          health, sessions, chat, execute
│   ├── tests/               Jest tests
│   ├── railway.json
│   └── .env.example
│
├── frontend/                Next.js App Router (static export)
│   ├── src/
│   │   ├── app/             Pages (landing, login, register, dashboard, tutor, settings)
│   │   ├── components/      UI + tutor components
│   │   ├── hooks/           useAuth, useTheme, useDebounce
│   │   ├── lib/             supabase, api, languages, utils
│   │   └── types/           Shared TypeScript types
│   ├── public/
│   │   └── .nojekyll        Required for GitHub Pages
│   ├── next.config.js
│   └── .env.example
│
├── .github/
│   └── workflows/
│       └── deploy-frontend.yml
└── README.md
```

---

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- An [OpenRouter](https://openrouter.ai) API key
- A [Judge0](https://rapidapi.com/judge0-official/api/judge0-ce) API key (RapidAPI hosted) **or** a self-hosted Judge0 instance
- An [Upstash](https://console.upstash.com) Redis database

---

## 1 — Supabase setup

### 1.1 Create project

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a region close to your Railway region (reduces latency)
3. Set a strong database password and save it

### 1.2 Enable email auth

Supabase → Authentication → Providers → Email → enable **Email + Password**.

Optionally disable **Confirm email** during development (re-enable for production).

### 1.3 Set redirect URLs

Supabase → Authentication → URL Configuration → **Site URL**:

```
https://<your-github-username>.github.io/<repo-name>
```

Add to **Redirect URLs**:

```
http://localhost:3000/**
https://<your-github-username>.github.io/<repo-name>/**
```

### 1.4 Collect credentials

From Supabase → Settings → API:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (secret — backend only) |
| `SUPABASE_JWT_SECRET` | Settings → API → JWT Settings → JWT Secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as SUPABASE_URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |

From Supabase → Settings → Database → Connection string (URI mode):

```
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
```

> **Why two URLs?** `DATABASE_URL` uses PgBouncer (connection pooling, required on Railway). `DIRECT_URL` is used by Prisma Migrate, which needs a direct connection.

### 1.5 How Supabase Auth relates to application data

Supabase manages users in its internal `auth.users` table. Your application tables (`LearningSession`, `ChatMessage`, `CodeState`) store `userId` which is the UUID from `auth.users.id`. The backend verifies the JWT on every request, extracts the user ID, and uses that for all DB operations — it never trusts a userId from the request body.

---

## 2 — Database setup (Prisma)

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, DIRECT_URL in .env

npm install
npm run prisma:generate
npm run prisma:migrate:dev -- --name init
```

For production (Railway):

```bash
npm run prisma:migrate   # runs: prisma migrate deploy
```

---

## 3 — OpenRouter setup

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Create an API key
3. Set `OPENROUTER_API_KEY` in `backend/.env`
4. Set `OPENROUTER_MODEL` to any model ID, e.g.:
   - `anthropic/claude-3-5-sonnet` (recommended — strong reasoning)
   - `openai/gpt-4o`
   - `meta-llama/llama-3.1-70b-instruct` (free tier available)

---

## 4 — Judge0 setup

### Option A: RapidAPI (hosted, easiest)

1. Sign up at [RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce)
2. Subscribe to Judge0 CE (free tier: 50 req/day)
3. Copy your RapidAPI key
4. Set in `backend/.env`:

```env
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=<your-rapidapi-key>
JUDGE0_USE_RAPIDAPI=true
```

### Option B: Self-hosted Judge0

Follow [Judge0's setup guide](https://github.com/judge0/judge0/blob/master/CHANGELOG.md). Then:

```env
JUDGE0_API_URL=http://localhost:2358    # or your server URL
JUDGE0_USE_RAPIDAPI=false
```

---

## 5 — Upstash Redis setup

1. Create account at [console.upstash.com](https://console.upstash.com)
2. New Redis database → copy REST URL and token
3. Set in `backend/.env`:

```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## 6 — Local development

### Backend

```bash
cd backend
cp .env.example .env
# Fill in all values

npm install
npm run prisma:generate
npm run prisma:migrate:dev -- --name init
npm run dev
# Backend starts on http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Fill in:
#   NEXT_PUBLIC_API_URL=http://localhost:4000
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...

npm install
npm run dev
# Frontend starts on http://localhost:3000
```

### Both together (from root)

```bash
npm run install:all
# In two separate terminals:
npm run dev:backend
npm run dev:frontend
```

---

## 7 — Deploy backend to Railway

1. Push this repository to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Select your repo → choose the `backend/` directory as the **root directory**
   - Railway settings → Root Directory: `backend`
4. Add all backend environment variables in Railway → Variables:

```
PORT=4000
NODE_ENV=production
DATABASE_URL=...
DIRECT_URL=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=anthropic/claude-3-5-sonnet
JUDGE0_API_URL=...
JUDGE0_API_KEY=...
JUDGE0_USE_RAPIDAPI=true
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
FRONTEND_URL=https://<your-github-username>.github.io
```

5. Railway will auto-detect `railway.json` and run:
   - Build: `npm ci && npm run prisma:generate && npm run build`
   - Start: `npm run prisma:migrate && npm run start`

6. Copy your Railway URL (e.g. `https://codecompass-backend.up.railway.app`)

---

## 8 — Deploy frontend to GitHub Pages

### 8.1 Enable GitHub Pages

Go to your GitHub repo → Settings → Pages → Source → **GitHub Actions**

### 8.2 Add repository secrets

Settings → Secrets and variables → Actions → New repository secret:

| Secret name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_BASE_PATH` | `/your-repo-name` (or empty for custom domain) |

### 8.3 Push to main

```bash
git add .
git commit -m "Initial CodeCompass deployment"
git push origin main
```

The GitHub Actions workflow (`.github/workflows/deploy-frontend.yml`) will build the static Next.js export and deploy it to GitHub Pages automatically on every push to `main` that touches `frontend/`.

### 8.4 Custom domain (optional)

If you have a custom domain, set `NEXT_PUBLIC_BASE_PATH=` (empty) and configure your DNS + CNAME in GitHub Pages settings.

---

## 9 — Running tests

```bash
cd backend
npm run test
```

The test suite covers:
- Rejecting unauthenticated requests on all protected endpoints
- Access control (tokens required, invalid tokens rejected)
- Input validation (request body limits and shapes)
- 404 handler
- Health endpoint

> **Note:** Integration tests that verify actual session ownership (user A cannot access user B's session) require two real Supabase tokens and are documented but not run in CI to avoid credential requirements.

---

## 10 — Optional monitoring

### Sentry (error tracking)

```env
# backend/.env
SENTRY_DSN=https://...@sentry.io/...

# frontend/.env.local
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

When set, Sentry is initialized. **Code content and chat messages are never captured** — only error stack traces and request metadata.

### PostHog (usage analytics)

```env
# frontend/.env.local
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

When set, PostHog captures page views and button clicks. Code content is never sent.

---

## 11 — Commercial SaaS version (future)

This is a **free educational MVP** hosted on GitHub Pages (static) + Railway (backend). To build a paid SaaS:

1. Move the frontend to **Vercel** or another Node-capable host (enables Server-Side Rendering, API routes, edge functions)
2. Add **Stripe** or **Lemon Squeezy** for payments
3. Implement subscription tiers in the database
4. Gate AI and execution endpoints by subscription status in the backend middleware

Do **not** add payment code to this static GitHub Pages version — it cannot securely process webhooks.

---

## Environment variable reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 4000) |
| `NODE_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | Yes | Allowed CORS origin |
| `DATABASE_URL` | Yes | Supabase PostgreSQL pooled URL |
| `DIRECT_URL` | Yes | Supabase PostgreSQL direct URL (Prisma Migrate) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (never expose to frontend) |
| `SUPABASE_JWT_SECRET` | Yes | Supabase JWT secret |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `OPENROUTER_MODEL` | No | Model ID (default: anthropic/claude-3-5-sonnet) |
| `JUDGE0_API_URL` | Yes | Judge0 base URL |
| `JUDGE0_API_KEY` | No | RapidAPI key (required when JUDGE0_USE_RAPIDAPI=true) |
| `JUDGE0_USE_RAPIDAPI` | No | `true` for RapidAPI hosted Judge0 |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST token |
| `SENTRY_DSN` | No | Sentry DSN (optional) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `NEXT_PUBLIC_BASE_PATH` | No | GitHub Pages subpath (e.g. `/codecompass`) |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog key (optional) |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | PostHog host (optional) |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN (optional) |

---

## Security notes

- The backend **never executes student code directly** — all execution goes through Judge0's isolated sandbox
- OpenRouter, Judge0, database, and Redis credentials are backend-only
- The frontend only has the Supabase anon key (safe to expose)
- Every protected endpoint verifies the Supabase JWT and extracts the user ID server-side
- Code, comments, and execution output are passed to the AI as clearly marked `<student_code>` blocks — the system prompt instructs the AI to treat them as untrusted context
- Rate limiting: 20 AI requests/minute, 30 executions/minute per user
- Code size limit: 64 KB. Message size: 8 KB. Context: 50 messages max
