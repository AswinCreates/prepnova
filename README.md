# PrepNova — AI Mock Interview & Interview Evaluation Platform

PrepNova is a full-stack mock interview platform for an academic BCA 5th-semester minor
project. Candidates configure a mock interview (mode, domain, difficulty), answer timed
questions by **typing or speaking** (Web Speech API), and receive AI-assisted evaluation
with a score, summary, strengths/weaknesses, and per-question feedback.

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4 + React Router v7 + Axios + Recharts + react-hot-toast
- **Backend:** Node.js + Express REST API
- **Database:** PostgreSQL 18
- **AI Evaluation:** Provider-agnostic service (OpenAI / Gemini / Anthropic) with a built-in deterministic fallback evaluator

## Project Structure

```
prepnova/
├── src/                          # React frontend
│   ├── components/               # UI primitives + SpeechInterview + ProtectedRoute
│   ├── context/AuthContext.jsx   # Real JWT auth state (login/signup/logout/me)
│   ├── hooks/useTimer.js         # Per-question countdown timer
│   ├── pages/                    # Login, Signup, Dashboard, Profile, InterviewSetup/Start/Session/Results/History
│   └── services/api.js           # Axios instance + bearer token + 401 handling
├── server/                       # Node + Express + PostgreSQL backend
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── app.js / server.js    # Express app + entry point
│       ├── config/db.js          # pg Pool
│       ├── middleware/           # auth (JWT), errorHandler, validation
│       ├── controllers/          # auth, user, question, interview, dashboard
│       ├── services/             # aiEvaluationService + heuristicEvaluation
│       ├── routes/               # REST route definitions
│       └── db/                   # schema.sql, migrate.js, seed.js, reset.js
├── .env.example                  # Frontend env example (VITE_API_BASE_URL)
└── vite.config.js
```

## Prerequisites

- Node.js 18+ (tested on 22)
- PostgreSQL (tested on 18)
- npm

## Setup

### 1. Database (PostgreSQL)

Start PostgreSQL, then create the database:

```bash
psql -U postgres -c "CREATE DATABASE prepnova;"
```

### 2. Backend

```bash
cd server
npm install
cp .env.example .env     # edit credentials/keys as needed
npm run db:migrate        # apply schema
npm run db:seed           # load the question bank + demo user
npm run dev               # starts http://localhost:5000
```

- `npm run db:reset` drops and recreates tables (local dev only).
- The seed adds a **demo user** `demo@prepnova.com` / `Demo123!`.

### 3. Frontend

```bash
cd ..                       # prepnova/ root
npm install
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:5000/api
npm run dev                 # starts Vite dev server
```

Open the printed Vite URL (default http://localhost:5173).

---

## AI Evaluation Configuration

The backend supports any OpenAI-compatible provider plus Gemini and Anthropic. Configure
in `server/.env`:

```
AI_PROVIDER=openai          # openai | gemini | anthropic
AI_MODEL=gpt-4o-mini
AI_API_KEY=your-key         # leave empty to use the built-in deterministic evaluator
AI_BASE_URL=https://api.openai.com/v1
AI_TIMEOUT_MS=30000
```

- The evaluation service asks the model for strict JSON, validates + sanitizes it, and
  stores results in the `evaluations` table.
- If the AI call fails (no key, rate limit, timeout, malformed output), it **safely falls
  back** to a deterministic rule-based evaluator (never randomized), and the results page
  labels which source was used.

## Common Commands

| Command | Directory | Purpose |
|--------|-----------|---------|
| `npm run dev` | root | Vite dev server |
| `npm run build` | root | Production build |
| `npm run lint` | root | Lint frontend |
| `npm run dev` / `npm start` | server | REST API (port 5000) |
| `npm run db:migrate` | server | Apply schema |
| `npm run db:seed` | server | Seed questions + demo user |
| `npm run db:reset` | server | Drop + reapply schema |

## REST API (summary)

```
POST   /api/auth/register            # sign up → { token, user }
POST   /api/auth/login               # login    → { token, user }
GET    /api/auth/me                  # current user (JWT)
GET    /api/users/profile            # user profile (JWT)
PUT    /api/users/profile            # update name / preferred_domain / target_skills
GET    /api/questions/pool           # question bank, filters: mode, domain, difficulty
POST   /api/interviews               # create interview → interviewId + question set
GET    /api/interviews/history       # completed interviews (JWT)
GET    /api/interviews/:id           # interview + questions + answers (JWT)
POST   /api/interviews/:id/answers   # save typed/voice answers
POST   /api/interviews/:id/complete  # finalize → runs evaluation → returns results
GET    /api/interviews/:id/results   # detailed evaluation (JWT)
GET    /api/dashboard/stats          # totals, avg, best, domain split, timeline
```

## Speech (Voice) Interview

`src/components/SpeechInterview.jsx` uses the browser's Web Speech API:

- **STT:** `SpeechRecognition`/`webkitSpeechRecognition` transcribes spoken answers.
- **TTS:** `speechSynthesis` reads the question aloud.

It is integrated into `InterviewSession` via a **Typed / Voice** toggle. Voice answers are
captured and submitted through the same backend flow as typed answers (`answerMode: 'voice'`).
If the browser does not support the API, the UI falls back to text mode gracefully.
Best supported in Chrome/Edge.

## Troubleshooting

- **DB connection refused:** start PostgreSQL, confirm credentials in `server/.env`, then rerun `npm run db:migrate`.
- **401 redirects:** the API requires `Authorization: Bearer <token>`; the Axios interceptor adds it automatically from `localStorage`.
