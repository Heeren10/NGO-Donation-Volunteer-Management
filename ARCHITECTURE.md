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
    ai_service.py         NVIDIA NIM client for the AI Impact Storyteller
    services.py           shared aggregate queries (raised amounts, hours totals, name lookups) — one
                           batched query per caller instead of one query per row; used by campaigns.py,
                           analytics.py, volunteers.py, signups.py to avoid duplicating the same SUM/JOIN
    routers/
      auth.py             /auth/register, /auth/login, /auth/me
      donors.py           admin-only CRUD
      donations.py        admin-only CRUD, updates donor totals + campaign raised amount on create
      campaigns.py        admin-write / any-authenticated-read, + AI impact-report endpoints
      volunteers.py       admin CRUD (list/create/delete), self-or-admin (get/update)
      events.py           admin-write / any-authenticated-read
      signups.py          volunteer applies (self only, starts pending) or admin invites (starts confirmed); admin accepts/rejects/marks attendance
      communications.py   admin-only
      analytics.py        admin-only dashboard aggregates
```

### Data model

Defined once in `app/models.py`. Relationships:

```
Profile (login identity: name, email, password_hash, role: admin|volunteer)
   └── Volunteer (profile_id FK, nullable — admin has none; volunteer's operational record)
            └── EventSignup (volunteer_id FK, status: pending|confirmed|rejected|attended|no_show)

Donor ──< Donation >── Campaign ──< Event >── EventSignup
                          └── ImpactReport (AI-generated, cached per campaign)

Communication (donor_id or volunteer_id, nullable = broadcast)
```

- `Donor`, `Volunteer`, `Campaign`, `Event` are independent operational entities — `Volunteer` only gains a `profile_id` when that volunteer has a login (self-registered via `/auth/register`). Admin-added volunteer records without a login are allowed (`profile_id = null`).
- `Donation` create updates `Donor.total_donated` / `last_donation_date` inline (no trigger, just app-level logic in the router).
- `Campaign.raised_amount` is computed at read time (`SUM(Donation.amount) WHERE campaign_id = ...`), not stored.

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

Either way, staff later marks `attended` + logs hours via `PATCH /signups/{id}`.

### AI Impact Storyteller

`POST /campaigns/{id}/impact-report` (admin) gathers the campaign's real stats (donation count/sum, event count, volunteer count/hours), prompts NVIDIA NIM (OpenAI-compatible endpoint, model configurable via `NVIDIA_MODEL`), returns a narrative + donor email draft, caches it as an `ImpactReport` row. `GET /campaigns/{id}/impact-report` returns the latest cached one without re-generating.

## Frontend (`frontend/`)

```
frontend/
  app/
    layout.tsx            root layout — fonts, NavBar, theme tokens
    globals.css            design tokens (OKLCH), Tailwind v4 @theme mapping
    page.tsx                Dashboard (analytics)
    donors/                 admin: list + [id] detail (CRUD, donation recording, acknowledgments)
    volunteers/              admin: list + [id] detail (CRUD, signup review)
    campaigns/                admin: list + create
    events/                    admin: list + create; [id] detail (suggested volunteers + signups table)
    login/                     auth: login form
    register/                  auth: volunteer self-registration
    my/                         volunteer: own profile, browse+apply, my signups
  components/
    NavBar.tsx              role-aware nav (hides admin tabs from volunteer role)
    ui/                     shared primitives — Button, Input/Select/Textarea, Card, Badge, AuthLayout,
                             DotGrid, PageHeader, EmptyState, ProgressBar, Avatar, ProgressRing,
                             plus shared constants (SIGNUP_STATUS_VARIANT, EVENT_CATEGORY_LABELS)
    charts/                 Recharts wrappers, themed via CSS custom properties
  lib/
    api.ts                  typed fetch client — one function per backend endpoint
    auth.ts                 cookie-based token helpers (server-only), attach Authorization header
    jwt.ts                  dependency-free JWT payload decode, shared by lib/auth.ts and proxy.ts
  proxy.ts                  Next.js 16 middleware — redirect unauthenticated requests to /login; role-based route gating
```

- All data pages are **Server Components** — pages are `async function` and call `api.ts` directly with `await`, no client-side loading state needed for reads.
- All mutations are **Server Actions** (`"use server"` inline in the page) — forms `action={fn}`, `revalidatePath()` after, progressive enhancement by default (no client JS required for a form to work).
- Charts (`components/charts/`) are the only real Client Components (`"use client"`), since Recharts needs the DOM.
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
| `backend/.env` | `NVIDIA_API_KEY`, `NVIDIA_MODEL` | AI Impact Storyteller |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL` | Backend base URL |

## Deployment (not yet done)

Plan is Vercel (frontend) + wherever the backend lands (Postgres swap is a one-line `DATABASE_URL` change since the schema is ORM-defined, not raw SQL — see `PLAN.md`). No deployment has happened yet; everything above is local-only.
