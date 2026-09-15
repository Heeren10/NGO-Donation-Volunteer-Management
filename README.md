# NGO Management Platform

A centralized system for donor management, donation tracking, volunteer coordination, event management, and impact reporting — replacing the spreadsheets-and-WhatsApp reality most NGOs run on.

Built for a hackathon around four flagship differentiators:

- **AI Impact Storyteller** — turns a campaign's raw donation/event data into a donor-facing narrative summary and a personalized thank-you email draft, generated on demand.
- **Volunteer-to-event matching, two paths to the same table** — a volunteer applies to an event and staff accepts or rejects (self-service), or staff browses skill/location-ranked suggestions for an event and invites directly (confirmed immediately, since staff already vetted the choice).
- **AI Grant Proposal Generator** — one click reads the org's real track record (funds raised, campaigns, volunteer hours) straight from the database and drafts a complete, submission-ready grant proposal.
- **Proactive Campaign Prediction** — checks a region's weather forecast for floods/storms 3 days out (via the free Open-Meteo API) and, on a real risk, has the AI draft an emergency relief campaign and surface nearby volunteers to notify.

See [`PLAN.md`](PLAN.md) for the full strategy/scope reasoning and [`ARCHITECTURE.md`](ARCHITECTURE.md) for the technical reference (data model, auth design, folder layout).

## What makes this unique

Most NGO tools stop at record-keeping. Two features here go further:

**🤖 AI Grant Proposal Generator**
- **Problem:** Writing a grant application from scratch takes weeks NGOs don't have.
- **Solution:** AI reads the org's real funds-raised, campaign, and volunteer-hours data.
- **Result:** A complete, submission-ready proposal — in one click.

**🌩️ Proactive Campaign Prediction**
- **Problem:** NGOs act only after a disaster has already hit.
- **Solution:** AI watches live weather, 3 days ahead, for floods and storms.
- **Result:** Relief campaign auto-drafted, nearby volunteers alerted instantly.

Other CRMs record the past. This one writes and warns — before you ask.

## Features

**Admin/Staff** — donor CRUD + donation history, campaign & event management (full CRUD, with categories and auto-completion once a goal is met or the end date passes), volunteer roster with skills/hours, reviewing/accepting/rejecting volunteer applications, a Communication Center for donor acknowledgments, an analytics dashboard, AI-generated impact reports, an AI grant proposal generator, and proactive weather-risk alerts with AI-drafted emergency campaigns.

**Volunteer (self-service)** — register/log in independently of staff, manage their own profile, browse open events, apply, cancel their own pending/confirmed signups, and track their own hours and application history.

**Public (no login)** — a `/donate` checkout-style page for one-time donations against any active campaign (demo checkout — no real payment gateway wired up yet, see Future Work).

Two roles only — no multi-tenant NGO layer, no enterprise RBAC. See `PLAN.md`'s cut list for what was deliberately left out and why.

## Tech stack

| | |
|---|---|
| Backend | Python, FastAPI, SQLModel, SQLite, JWT auth |
| Frontend | Next.js (App Router, TypeScript), Tailwind CSS v4, Recharts |
| AI | NVIDIA NIM (free tier, OpenAI-compatible endpoint) |
| Weather | Open-Meteo (free, keyless geocoding + forecast API) |

Two independent services (`backend/`, `frontend/`) talking over plain HTTP/JSON — no shared code, no monorepo tooling.

## Getting started

### Backend

```bash
cd backend
python -m venv venv
./venv/Scripts/activate        # Windows; use `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
cp .env.example .env           # fill in JWT_SECRET, ADMIN_EMAIL/PASSWORD, NVIDIA_API_KEY
uvicorn app.main:app --reload --port 8000
```

A default admin account is seeded automatically on first run (from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`, printed to the console).

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # or create it with NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open `http://localhost:3000` — you'll land on `/login`. Staff use the seeded admin account; volunteers self-register at `/register`.

### Environment variables

| File | Variable | Purpose |
|---|---|---|
| `backend/.env` | `JWT_SECRET` | Signs auth tokens — set a real random value outside local dev |
| `backend/.env` | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seeded admin login (first run only) |
| `backend/.env` | `NVIDIA_API_KEY`, `NVIDIA_MODEL` | Powers all three AI features (Impact Storyteller, Grant Proposal Generator, emergency-campaign drafting) — free key at [build.nvidia.com](https://build.nvidia.com) |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL` | Backend base URL |

No key needed for weather — Open-Meteo is free and keyless.

## Project structure

```
backend/     FastAPI app — models, routers, auth, AI service (see ARCHITECTURE.md)
frontend/    Next.js app — pages, shared UI components, API client
PLAN.md      Strategy, scope decisions, what was cut and why
ARCHITECTURE.md   Technical reference: data model, auth design, folder layout
```

## Future work

Deliberately not built yet — see `PLAN.md`'s cut list for the full reasoning behind each cut:

- **Postgres + Supabase** — swap SQLite for Postgres and deploy on [Supabase](https://supabase.com) for managed hosting. The schema is entirely ORM-defined (`SQLModel`), so this is a `DATABASE_URL` change, not a rewrite.
- **Real payment gateway (Stripe)** — the current `/donate` page is a demo checkout; it logs a real `Donation` row but never touches an actual payment processor.
- **Donor self-service login** — donors are currently staff-managed records only; a donor portal to view personal giving history was scoped as a stretch goal.
- **Multi-NGO / Enterprise tier** — this is a single-organization tool today; a multi-tenant layer on top of the current schema would be needed to support multiple organizations.
- **WhatsApp/SMS bot** — outreach beyond the current email/SMS Communication Center.
- **Public transparency page** — a public-facing, always-on impact page beyond the one-off `/donate` checkout.

## License

No license file yet — add one (MIT is a common default for this kind of project) before treating this as open source.
