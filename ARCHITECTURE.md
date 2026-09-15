# Architecture

Technical reference for how the system is built. For *why* these choices and what's still to build, see `PLAN.md`.

## System overview

Two independently-run services, no shared code:

```
frontend/  Next.js (App Router, TypeScript) — talks to backend over HTTP as a REST client
backend/   FastAPI + SQLModel, isolated Python venv — SQLite for storage
```

They communicate over plain HTTP/JSON. `NEXT_PUBLIC_API_URL` (frontend `.env.local`) points at the backend, default `http://localhost:8000`. CORS on the backend allows `http://localhost:3000`.

## Backend (`backend/`)

```
backend/
  venv/                  isolated Python environment (not committed)
  requirements.txt       pinned dependencies (pip freeze)
  ngo.db                 SQLite database file (git-ignored, created on first run)
  check_db.py            schema smoke test — run after any model change
  .env / .env.example    JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, NVIDIA_API_KEY, NVIDIA_MODEL
  app/
    main.py              FastAPI app, CORS, router registration, lifespan (init_db + admin bootstrap)
    database.py          SQLite engine, init_db(), get_session() dependency
    models.py            SQLModel table definitions — single source of truth for the schema
    auth.py              password hashing (bcrypt), JWT issue/decode (pyjwt)
    deps.py              FastAPI dependencies: get_current_profile, require_admin, get_current_volunteer
    ai_service.py         NVIDIA NIM client — AI Impact Storyteller, AI Grant Proposal Generator,
                          and the emergency-campaign drafter behind Proactive Campaign Prediction
    weather_service.py    Open-Meteo client (free, keyless) — geocoding + severe-weather forecast checks
    services.py           shared aggregate queries (raised amounts, hours totals, name lookups, org-wide
                          stats) — one batched query per caller instead of one query per row; also owns
                          record_donation() and sync_campaign_status() so donor totals and auto-completion
                          can't drift between callers
    routers/
      auth.py             /auth/register, /auth/login, /auth/me
      public.py           no auth — GET /public/campaigns, POST /public/donate (the /donate checkout page)
      donors.py           admin-only CRUD
      donations.py        admin-only CRUD, updates donor totals + campaign raised amount on create
      campaigns.py        admin-write / any-authenticated-read; full CRUD (PATCH/DELETE too); auto-completes
                          on goal reached or end date passed; + AI impact-report endpoints
      volunteers.py       admin CRUD (list/create/delete), self-or-admin (get/update)
      events.py           admin-write / any-authenticated-read; full CRUD; skill/location-ranked
                          suggested-volunteers endpoint
      signups.py          volunteer applies (self only, starts pending) or admin invites (starts confirmed);
                          admin accepts/rejects/marks attendance/absence (only once the event date has
                          passed); either side can cancel a pending/confirmed signup before it happens
      communications.py   admin-only
      analytics.py        admin-only dashboard aggregates
      grants.py           admin-only — AI Grant Proposal Generator (POST generates + caches, GET fetches latest)
      weather.py          admin-only — Proactive Campaign Prediction (GET /weather/check?location=...)
```

### Data model

Defined once in `app/models.py`. Relationships:

```
Profile (login identity: name, email, password_hash, role: admin|volunteer)
   └── Volunteer (profile_id FK, nullable — admin has none; volunteer's operational record)
            └── EventSignup (volunteer_id FK, status: pending|confirmed|cancelled|rejected|attended|no_show)

Donor ──< Donation >── Campaign ──< Event >── EventSignup
                          └── ImpactReport (AI-generated, cached per campaign)

GrantProposal (AI-generated, org-wide — not tied to any one campaign)
Communication (donor_id or volunteer_id, nullable = broadcast)
```

- `Donor`, `Volunteer`, `Campaign`, `Event` are independent operational entities — `Volunteer` only gains a `profile_id` when that volunteer has a login (self-registered via `/auth/register`). Admin-added volunteer records without a login are allowed (`profile_id = null`).
- `Donation` create updates `Donor.total_donated` / `last_donation_date` inline via `services.record_donation()` — the one function both the admin donation form and the public `/donate` checkout call, so they can't drift apart.
- `Campaign.raised_amount` is computed at read time (`SUM(Donation.amount) WHERE campaign_id = ...`), not stored. `Campaign.status` auto-promotes `active` → `completed` the moment the goal is met or the end date passes (checked on every read, no scheduled job — see `services.sync_campaign_status()`).
- Deleting a `Campaign` detaches (not deletes) its `Donation`/`Event` rows, since those are historical records. Deleting an `Event` cascades its `EventSignup` rows, since a signup can't outlive the event it's for.

### Auth

JWT, two roles, no session store (stateless, 7-day expiry token).

- `POST /auth/register` — public. Creates a `Profile(role=volunteer)` + linked `Volunteer` row, returns a token (auto-login).
- `POST /auth/login` — public. Verifies password, returns a token for either role.
- `GET /auth/me` — authenticated. Returns profile + `volunteer_id` if applicable.
- Admin account is **seeded on startup**, not registered through the API (`bootstrap_admin()` in `main.py` — creates one if no admin `Profile` exists yet, from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars, default `admin@ngo.local` / `admin123`).
- Frontend sends `Authorization: Bearer <token>` on every request; the token itself is stored in an httpOnly cookie set by a Next.js Server Action (not accessible to client JS).
- `require_admin` / `get_current_volunteer` FastAPI dependencies gate routes; a volunteer's own record is matched via `profile_id`, not by trusting a client-supplied ID.

### Volunteer-to-event matching

Two paths into the same `EventSignup` table:

- **Self-service** — volunteer browses `GET /events/`, applies via `POST /signups/` (volunteer_id forced to their own record — can't apply on someone else's behalf). Status starts `pending`; staff reviews and `PATCH /signups/{id}` to `confirmed`/`rejected`.
- **Staff-initiated** — staff opens `GET /events/{id}/suggested-volunteers` (admin-only), which ranks volunteers not already signed up for that event by skill overlap (comma-tokenized `Event.roles_needed` ∩ `Volunteer.skills`, weight 3 per match) plus a location substring bonus (weight 2), and invites one via `POST /signups/` with an explicit `volunteer_id`. Status starts `confirmed` directly — staff already vetted the choice, so there's no separate approval step.

Either way, once the event's date has passed, staff resolve the signup to `attended` (+ logs hours) or `no_show`. Before that date, either the volunteer or staff can cancel a `pending`/`confirmed` signup — all of this is enforced server-side in `PATCH /signups/{id}`, not just hidden in the UI (a volunteer can only touch their own signup, and attendance can't be recorded before the event date, both checked against the real `Event.date`).

### AI Impact Storyteller

`POST /campaigns/{id}/impact-report` (admin) gathers the campaign's real stats (donation count/sum, event count, volunteer count/hours), prompts NVIDIA NIM (OpenAI-compatible endpoint, model configurable via `NVIDIA_MODEL`), returns a narrative + donor email draft, caches it as an `ImpactReport` row. `GET /campaigns/{id}/impact-report` returns the latest cached one without re-generating.

### AI Grant Proposal Generator

`POST /grants/proposal` (admin) gathers org-wide stats via `services.gather_org_stats()` (total raised, top campaigns, donor/volunteer counts, volunteer hours, events held — no per-campaign scoping, this is the whole organization's track record) and prompts NVIDIA NIM for a full multi-section Markdown proposal (Executive Summary through Funding Request), cached as a `GrantProposal` row. `GET /grants/proposal` returns the latest cached one. This call generates far more output than the impact report, so it gets its own longer per-request timeout (`GRANT_PROPOSAL_TIMEOUT_SECONDS`, 90s) — the OpenAI SDK's default retry-on-timeout is disabled globally (`max_retries=0`) so a slow call fails once, cleanly, instead of silently tripling the wait. The frontend renders the Markdown with a small dependency-free renderer (`components/ui/Markdown.tsx`) and offers a native browser print-to-PDF button.

### Proactive Campaign Prediction

`GET /weather/check?location=` (admin) geocodes the place name and pulls a 3-day forecast from **Open-Meteo** (`app/weather_service.py` — free, no API key). If the forecast shows heavy rain or a thunderstorm (WMO weather codes 65/82/95/96/99, or ≥40mm of rain on any day), it's flagged as a risk and NVIDIA NIM drafts an emergency relief campaign (name + description). The frontend (`/alerts`) shows the alert, the AI draft, a link that pre-fills the existing "New campaign" form (`category=disaster_relief`, no separate campaign-creation flow), and a list of volunteers whose `location` matches the alert region, each with a one-click "Notify" that reuses the existing `POST /communications/` endpoint — no new bulk-notification system.

## Frontend (`frontend/`)

```
frontend/
  app/
    layout.tsx            root layout — fonts, NavBar, theme tokens
    globals.css            design tokens (OKLCH), Tailwind v4 @theme mapping, print stylesheet
    page.tsx                Dashboard (analytics)
    donors/                 admin: list + [id] detail (CRUD, donation recording, acknowledgments)
    volunteers/              admin: list + [id] detail (CRUD, signup review)
    campaigns/                admin: list + create (accepts ?name=&category= prefill); [id] detail (full CRUD)
    events/                    admin: list + create; [id] detail (full CRUD, suggested volunteers, signups table)
    grants/                    admin: AI Grant Proposal Generator — generate/regenerate, print/export
    alerts/                    admin: Proactive Campaign Prediction — GET-based location check, no client JS
    donate/                    public, no login — checkout-style one-time donation + success receipt
    login/                     auth: login form
    register/                  auth: volunteer self-registration
    my/                         volunteer: own profile, browse+apply, cancel own signups, my signups
  components/
    NavBar.tsx              role-aware nav (hides admin tabs from volunteer role)
    ui/                     shared primitives — Button, Input/Select/Textarea, Card, Badge, AuthLayout,
                             DotGrid, PageHeader, EmptyState, ProgressBar, Avatar, ProgressRing, Field,
                             FieldGrid, plus shared constants (SIGNUP_STATUS_VARIANT/LABEL,
                             EVENT_CATEGORY_LABELS, CAMPAIGN_CATEGORY_LABELS); Markdown.tsx, SubmitButton.tsx
                             (pending-state via useFormStatus), PrintButton.tsx live alongside as separate
                             default-export files, same pattern as AnimatedNumber.tsx
    charts/                 Recharts wrappers, themed via CSS custom properties
  lib/
    api.ts                  typed fetch client — one function per backend endpoint; slow AI-generation
                             calls (grants, weather) pass a longer per-call `timeoutMs` override
    auth.ts                 cookie-based token helpers (server-only), attach Authorization header
    jwt.ts                  dependency-free JWT payload decode, shared by lib/auth.ts and proxy.ts
  proxy.ts                  Next.js 16 middleware — redirect unauthenticated requests to /login; role-based
                             route gating (admin-only: /, /donors, /volunteers, /grants, /alerts); excludes
                             the whole _next/ namespace (not just static/image) so the dev-mode HMR socket
                             is never routed through auth logic
```

- All data pages are **Server Components** — pages are `async function` and call `api.ts` directly with `await`, no client-side loading state needed for reads.
- All mutations are **Server Actions** (`"use server"` inline in the page) — forms `action={fn}`, `revalidatePath()` after, progressive enhancement by default (no client JS required for a form to work).
- Client Components (`"use client"`) are the exception, reached for only where the DOM or interactivity is unavoidable: charts (Recharts), `NavBar` (active-link highlighting), `AnimatedNumber`, `SubmitButton` (pending state via `useFormStatus`), and `PrintButton` (`window.print()`). Data pages and forms stay server-rendered.
- Design tokens live in `app/globals.css` as OKLCH CSS custom properties, mapped into Tailwind v4 via `@theme inline`. `primary`/`accent`/`danger` are fixed across light/dark (verified ≥4.5:1 with white button text in both themes); `bg`/`surface`/`border`/`ink`/`muted` swap per theme; `-text` variant tokens (`primary-text`, `accent-text`, `danger-text`) exist separately for text-on-wash contexts (badges, ghost buttons) where the fixed fill color doesn't have enough contrast against the page background itself.

## Local development

```bash
# backend
cd backend
./venv/Scripts/uvicorn app.main:app --reload --port 8000

# frontend
cd frontend
npm run dev
```

Backend seeds a default admin account on first startup (printed to console). Frontend expects the backend at `http://localhost:8000` (`frontend/.env.local`).

## Environment variables

| File | Var | Purpose |
|---|---|---|
| `backend/.env` | `JWT_SECRET` | Signs auth tokens — set a real value outside dev |
| `backend/.env` | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seeded admin login (first run only) |
| `backend/.env` | `NVIDIA_API_KEY`, `NVIDIA_MODEL` | Powers all three AI features — Impact Storyteller, Grant Proposal Generator, emergency-campaign drafting |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL` | Backend base URL |

No env var is needed for weather — Open-Meteo is free and keyless.

## Deployment (not yet done)

Plan is Vercel (frontend) + **Supabase-hosted Postgres** (backend). The Postgres swap is a one-line `DATABASE_URL` change since the schema is entirely ORM-defined via SQLModel, not raw SQL (see `PLAN.md` and the README's Future Work section). No deployment has happened yet; everything above is local-only, SQLite-backed.
