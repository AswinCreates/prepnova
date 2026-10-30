# PrepNova — AI Mock Interview & Interview Evaluation Platform

PrepNova is a full-stack mock interview platform for an academic BCA 5th-semester minor
project. Candidates configure a mock interview (mode, domain, difficulty), answer timed
questions by **typing or speaking** (Web Speech API), and receive AI-assisted evaluation
with a score, summary, strengths/weaknesses, and per-question feedback. Practice can be
focused around an optional target role and job description, and candidates can retry their
lowest-scoring questions as a dedicated session. The personal **Answer Story Vault** lets
candidates save reusable experiences in Situation, Task, Action, and Result sections and
tag them with the skills they demonstrate.

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
│   ├── pages/                    # Login, Signup, Dashboard, Profile, StoryVault, interview and report pages
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
npm run db:admin          # create/promote the initial admin account
npm run dev               # starts http://localhost:5000
```

Run `npm run db:migrate` again when updating an existing database; it applies new schema
fields and tables, including role-based access and login activity tracking.

The initial admin signs in through the regular login page with `aswin@admin.prepnova`.
Its initial password is `aswinadm123`. Set `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`,
and `INITIAL_ADMIN_PASSWORD` in `server/.env` to configure these values before running
`npm run db:admin`. Admins can visit **Admin console** to view account/login analytics
and create additional admin accounts. Public signup always creates a standard user.

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

The backend supports OpenAI-compatible endpoints, Gemini, and Anthropic. Copy
`server/.env.example` to `server/.env` and set the provider and its API key:

```
AI_PROVIDER=openai          # openai | gemini | anthropic
AI_MODEL=gpt-4o-mini        # optional; defaults are provider-specific
AI_API_KEY=your-provider-key
AI_TIMEOUT_MS=30000
```

- The evaluation service asks the model for strict JSON, validates + sanitizes it, and
  stores results in the `evaluations` table.
- Evaluations use the selected interview mode and domain. The coaching rubric checks
  technical reasoning for technical interviews and relevance, ownership, reflection,
  and evidence for HR interviews. MCQ answers are graded deterministically.
- Keep the API key in `server/.env`; never put it in a `VITE_` variable or frontend code.
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
| `npm run db:admin` | server | Create/promote the initial admin account |
| `npm run db:reset` | server | Drop + reapply schema |

## REST API (summary)

```
POST   /api/auth/register            # sign up → { user }, sets HttpOnly session cookie
POST   /api/auth/login               # login    → { user }, optional 30-day remember cookie
POST   /api/auth/logout              # clear the auth cookie
GET    /api/auth/me                  # current user (auth cookie; legacy bearer tokens accepted)
GET    /api/users/profile            # user profile (JWT)
PUT    /api/users/profile            # update name / preferred_domain / target_skills
GET    /api/users/stories            # list the signed-in user's STAR stories
POST   /api/users/stories            # create a personal story
PUT    /api/users/stories/:id        # update an owned story
DELETE /api/users/stories/:id        # delete an owned story
GET    /api/questions/pool           # question bank, filters: mode, domain, difficulty
POST   /api/interviews               # create interview → interviewId + question set
POST   /api/interviews/:id/retry     # create a focused retry from the lowest-scoring questions
GET    /api/interviews/history       # completed interviews (JWT)
GET    /api/interviews/:id           # interview + questions + answers (JWT)
POST   /api/interviews/:id/answers   # save typed/voice answers
POST   /api/interviews/:id/complete  # finalize → runs evaluation → returns results
GET    /api/interviews/:id/results   # detailed evaluation (JWT)
GET    /api/dashboard/stats          # totals, avg, best, domain split, timeline
```

## Speech (Voice) Interview

`src/components/SpeechInterview.jsx` records microphone audio in the browser and submits it to the authenticated transcription endpoint:

- **STT:** Gemini 3.5 Transcribe with an `en-IN` language hint and the signed-in user's display name as custom vocabulary.
- **TTS:** `speechSynthesis` reads the question aloud.

It is integrated into `InterviewSession` via a **Typed / Voice** toggle. Voice answers are
captured and submitted through the same backend flow as typed answers (`answerMode: 'voice'`).
Users can review and edit the transcript before adding it to their answer. Set `AI_TRANSCRIPTION_MODEL` in `server/.env` to override the default transcription model.

## Sign-in Cookies

On first visit, PrepNova asks users to **Accept** or **Deny** optional persistent sign-in
cookies. Accepting enables the **Remember me for 30 days** option on login and signup;
denying keeps authentication session-only. The required sign-in cookie is HttpOnly, and the
JWT is not stored in `localStorage`. Cookie preferences can be reopened from **Cookie settings**.
For local development, the backend allows `http://localhost:5173` and `http://127.0.0.1:5173`; set
`CORS_ORIGINS` in `server/.env` to the exact frontend origin(s) when deploying. If the
frontend and API are on separate sites, configure HTTPS and `COOKIE_SAME_SITE=none`.

## Troubleshooting

- **DB connection refused:** start PostgreSQL, confirm credentials in `server/.env`, then rerun `npm run db:migrate`.
- **Cookie sign-in fails across origins:** check that the frontend origin is listed in `CORS_ORIGINS`, requests include credentials, and deployed frontend/API domains use HTTPS. For separate sites, set `COOKIE_SAME_SITE=none`.
