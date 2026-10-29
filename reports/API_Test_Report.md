# PrepNova API Test Report

**Test date:** 29 October 2026  
**Environment:** Local PrepNova API with PostgreSQL  
**API base:** `http://localhost:5000/api`

## Summary

The API server and PostgreSQL connection were available during this run. **56 checks passed** and **one operation was intentionally skipped**. All 40 declared API routes were inventoried; 39 were exercised and the leaderboard reset route was reviewed but not invoked. Temporary test accounts, tickets, interviews, and questions were removed after the run.

The interview completion endpoint returned an AI sourced evaluation with five question evaluations and no provider error. The server is configured to use Gemini. Audio transcription was checked for invalid request handling only; no real audio was sent to the external provider.

## Test results by area

| Area | Coverage | Result |
| --- | --- | --- |
| Health | API health response | Passed, HTTP 200 |
| Authentication | Registration, login, current user, duplicate registration, invalid credentials, missing token | Passed; expected HTTP 201, 200, 409, and 401 responses |
| User profile | Read and update profile | Passed, HTTP 200 |
| Answer Story Vault | List, create, update, and delete story | Passed; HTTP 200 and 201 as expected |
| Question pool | Authenticated question pool retrieval | Passed, HTTP 200 |
| Dashboard and leaderboard | User statistics and leaderboard retrieval | Passed, HTTP 200 |
| Notifications | List, mark one read, and mark all read | Passed, HTTP 200 |
| User support | Create/list/read ticket and send a user reply | Passed; HTTP 200 and 201 as expected |
| Admin support | List/read ticket, reply, and close ticket | Passed; HTTP 200 and 201 as expected |
| Admin management | Admin dashboard, accounts, questions, create admin, and delete disposable accounts | Passed; HTTP 200 and 201 as expected |
| Admin question management | List and create a disposable question | Passed; HTTP 200 and 201 as expected |
| Interview lifecycle | Create, read, save answers, complete, fetch results, and retry weak questions | Passed; HTTP 200 and 201 as expected |
| Interview integrity | Three tab-switch strikes and suspended interview visibility in history | Passed; strike requests returned HTTP 200 and history returned HTTP 200 |
| AI evaluation | Complete an interview and inspect evaluation source | Passed; HTTP 200, source `ai`, five question evaluations, no provider error |
| Audio transcription | Invalid/missing audio payload validation | Passed; expected HTTP 400 |

## Route coverage

### Health and authentication

| Method and route | Result |
| --- | --- |
| `GET /health` | Passed, 200 |
| `POST /auth/register` | Passed, 201; duplicate email returned expected 409 |
| `POST /auth/login` | Passed, 200; incorrect password returned expected 401 |
| `GET /auth/me` | Passed, 200 with token and expected 401 without token |

### User and interview routes

| Method and route | Result |
| --- | --- |
| `GET /users/profile`, `PUT /users/profile` | Passed, 200 |
| `GET /users/stories`, `POST /users/stories`, `PUT /users/stories/:id`, `DELETE /users/stories/:id` | Passed, 200/201 |
| `GET /questions/pool` | Passed, 200 |
| `GET /dashboard/stats`, `GET /dashboard/leaderboard` | Passed, 200 |
| `GET /notifications`, `POST /notifications/read-all`, `POST /notifications/:id/read` | Passed, 200 |
| `GET /support/tickets`, `POST /support/tickets`, `GET /support/tickets/:id`, `POST /support/tickets/:id/messages` | Passed, 200/201 |
| `GET /interviews/history`, `POST /interviews`, `GET /interviews/:id` | Passed, 200/201 |
| `POST /interviews/:id/answers`, `POST /interviews/:id/tab-switch` | Passed, 200; three strikes suspended the disposable interview as expected |
| `POST /interviews/:id/complete`, `GET /interviews/:id/results`, `POST /interviews/:id/retry` | Passed, 200/201; AI evaluation source was `ai` |
| `POST /interviews/transcribe` | Invalid payload correctly returned 400; external speech provider was not called |

### Admin routes

| Method and route | Result |
| --- | --- |
| `GET /admin/dashboard`, `GET /admin/accounts`, `GET /admin/questions` | Passed, 200 |
| `POST /admin/admins`, `DELETE /admin/accounts/:id` | Passed, 201/200 against disposable records |
| `POST /admin/questions` | Passed, 201; disposable question removed after the check |
| `GET /admin/support/tickets`, `GET /admin/support/tickets/:id`, `POST /admin/support/tickets/:id/messages`, `POST /admin/support/tickets/:id/close` | Passed, 200/201 |
| `POST /admin/leaderboard/reset` | **Skipped.** This changes the global leaderboard reset point, so it was not invoked against the shared database. |

## Notes and limits

- Test data used unique disposable accounts and temporary records. User deletion cascaded through associated test records; no test account or interview was retained.
- The leaderboard reset endpoint is the sole route not executed because it changes shared application state. Its route and authorization middleware were reviewed in source.
- Speech transcription received a malformed-payload check only. Live audio transcription and external provider availability remain unverified by this run.
- AI evaluation was exercised through interview completion. The response identified its source as `ai`, returned five question evaluations, and had no provider error.
- These results describe this local run; they do not certify production hosting, load capacity, or browser microphone permissions.
