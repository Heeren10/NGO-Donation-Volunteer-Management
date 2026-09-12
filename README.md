# NGO Management Platform

A centralized system for donor management, donation tracking, volunteer coordination, event management, and impact reporting — replacing the spreadsheets-and-WhatsApp reality most NGOs run on.

Built for a hackathon around two flagship differentiators:

- **AI Impact Storyteller** — turns a campaign's raw donation/event data into a donor-facing narrative summary and a personalized thank-you email draft, generated on demand.
- **Volunteer-to-event matching, two paths to the same table** — a volunteer applies to an event and staff accepts or rejects (self-service), or staff browses skill/location-ranked suggestions for an event and invites directly (confirmed immediately, since staff already vetted the choice).

See [`PLAN.md`](PLAN.md) for the full strategy/scope reasoning and [`ARCHITECTURE.md`](ARCHITECTURE.md) for the technical reference (data model, auth design, folder layout). Pitch materials are in [`presentation.md`](presentation.md) and [`ppt_slides.md`](ppt_slides.md).

## Features

**Admin/Staff** — donor CRUD + donation history, campaign & event management (with categories), volunteer roster with skills/hours, reviewing and accepting/rejecting volunteer applications, a Communication Center for donor acknowledgments, an analytics dashboard, and the AI-generated impact reports.

**Volunteer (self-service)** — register/log in independently of staff, manage their own profile, browse open events, apply, and track their own hours and application history.

Two roles only — no multi-tenant NGO layer, no enterprise RBAC. See `PLAN.md`'s cut list for what was deliberately left out and why.

## Tech stack

| | |
|---|---|
| Backend | Python, FastAPI, SQLModel, SQLite, JWT auth |
| Frontend | Next.js (App Router, TypeScript), Tailwind CSS v4, Recharts |
| AI | NVIDIA NIM (free tier, OpenAI-compatible endpoint) |

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
| `backend/.env` | `NVIDIA_API_KEY`, `NVIDIA_MODEL` | Powers the AI Impact Storyteller — free key at [build.nvidia.com](https://build.nvidia.com) |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL` | Backend base URL |

## Project structure

```
backend/     FastAPI app — models, routers, auth, AI service (see ARCHITECTURE.md)
frontend/    Next.js app — pages, shared UI components, API client
PLAN.md      Strategy, scope decisions, what was cut and why
ARCHITECTURE.md   Technical reference: data model, auth design, folder layout
```

## License

No license file yet — add one (MIT is a common default for this kind of project) before treating this as open source.
