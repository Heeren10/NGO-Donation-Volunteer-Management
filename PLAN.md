# NGO Management Platform — Hackathon Strategy & Build Plan

## Context

Problem statement: NGOs run on spreadsheets, email, and disconnected tools, causing fragmented donor data, poor volunteer coordination, and no visibility into campaign impact. The expected solution is a centralized platform: donor profiles, donation tracking, volunteer scheduling, event management, campaign tracking, communication tools, analytics.

An "enterprise" version of this same problem statement is circulating (5 user roles, multi-tenant NGO marketplace, discussion forums, GIS heatmaps, JWT + email verification + password reset). That's scope inflation for a hackathon build — checked, it has no real implementation behind it either. This plan takes the genuinely useful pieces and cuts the rest. See **Cut list** at the bottom for exactly what and why.

This is being rebuilt against this plan — v1 (no auth, single implicit "staff" view) is functional but doesn't reflect real usage: right now every endpoint is wide open and there's no volunteer self-service. The rebuild's job is to add the two roles below without dragging in the 5-role enterprise system.

## Roles (2, not 5)

Two roles, not five. A 3rd (Donor self-service login) is listed as a stretch, not built now — donors stay as records managed by staff, same as today, unless time remains after everything else.

1. **Admin/Staff** — full platform access. Runs the NGO's operations: donors, donations, campaigns, events, volunteers, communications, analytics, AI impact reports. This is the role the current app already behaves as (just without a login gate).
2. **Volunteer** — self-service. Registers, logs in, manages their own profile (skills/availability/location), browses events, signs up, sees their own hours and signup history. Cannot see donor financials, other volunteers' details, or admin screens.

**Stretch (only if 1-2 are solid with time left): Donor** — self-service login to view their own giving history and campaign impact updates. Not built in the initial rebuild.

## Full feature list, by role

### Admin/Staff

- **Donors** — full CRUD, donation history per donor, recurring-donor flag, receipts/acknowledgments, search/filter (name, tag, recurring status).
- **Donations** — record online/offline, link to campaign, auto-updates donor totals + campaign raised amount.
- **Campaigns** — full CRUD, category (Education/Healthcare/Environment/Animal Welfare/Disaster Relief/Women Empowerment/Community Development/Child Welfare — one enum field, not a separate module), goal/progress tracking, status (draft/active/completed), search/filter (category, status, date range).
- **Events** — full CRUD, category (Fundraising/Awareness/Community Drive/Workshop/Training/Charity Campaign), roles needed, location, search/filter (category, date, location).
- **Volunteers** — full CRUD, view all volunteers + skills/hours/history, search/filter (skill, location, availability).
- **Volunteer applications** — review and accept/reject volunteer sign-ups per event (replaces "auto-score and suggest" — see open question below).
- **Communication Center** — send acknowledgments/announcements/reminders to donors or volunteers, history log.
- **Analytics dashboard** — key stats, donations-over-time, campaign performance, volunteer hours, lapsed-donor flag, top donors.
- **AI Impact Storyteller** — generate a narrative impact summary + donor email draft per campaign (built on the backend, needs a UI + your NVIDIA API key to actually run).
- **CSV export** — off the existing analytics summary.

### Volunteer

- **Register / log in** — own account, separate from the admin login.
- **Profile** — view/edit own skills, availability, location, contact info.
- **Browse events** — search/filter by cause/category, skill needed, location, date.
- **Apply to an event** — self-service sign-up (status starts pending until staff accepts — see open question below).
- **My hours & history** — own volunteer hours total, past and upcoming signups, attendance status.

### Shared / platform-level

- Light/dark theme (already built).
- Responsive layout (already built, desktop-first — no separate mobile app work planned).

## What makes this stand out (differentiators)

1. **AI Impact Storyteller** — one click on a campaign turns raw donation/event data into a narrative impact summary *and* a personalized donor email draft. Built on the backend (`/campaigns/{id}/impact-report`, NVIDIA NIM), **still needs a frontend UI and your API key to actually demo**.
2. **Volunteer-to-event matching** — **decided (revised): both paths, combined.** A volunteer can browse events and apply directly (signup starts `pending`, staff reviews and accepts/rejects). Staff can also open an event and see volunteers ranked by skill/location overlap (`GET /events/{id}/suggested-volunteers` — comma-tokenized skill intersection + location substring match) and invite one directly (signup starts `confirmed` — staff already vetted the choice, no separate approval step needed). Neither path replaces the other; both write to the same `EventSignup` table.

## Cut list (explicitly not building, and why)

- **Multi-tenant NGO management / Super Admin role** — this is one NGO's internal tool, not a marketplace of NGOs.
- **5-role RBAC, JWT + email verification + password reset** — 2 roles with simple session auth covers the real need; email verification/password reset are production-account-recovery concerns, not hackathon-demo concerns.
- **Discussion forums / messaging system** — out of scope relative to payoff, effectively "build a mini-Slack."
- **GIS mapping / volunteer distribution heatmaps** — a full mapping integration for a feature nobody asked for in the original problem statement.
- **Volunteer certifications module, community rankings/leaderboards** — certifications fit as free text in the existing `skills` field; leaderboards are gamification nobody will demo-judge on.
- **Vague "AI recommendation engine" / "impact forecasting" / "resource optimization"** — undefined bullets with no real behavior specified anywhere they came from. One well-built AI feature beats five hand-wavy ones.
- **NGO verification status** — meaningless in a single-org system.
- **Real payment gateway** — mock donations instead.
- **WhatsApp/SMS bot** — mention as future work, not built.
- **Public transparency page, full SEO/AEO/GEO pass** — stretch, only after the roles/auth rebuild and differentiators are solid.

## Architecture

Two top-level folders, `backend/` and `frontend/` — separate deployable services.

- **`backend/`** — Python, FastAPI + SQLModel, in its own `venv/`. SQLModel gives Pydantic validation + ORM from one schema (`backend/app/models.py`).
- **`frontend/`** — Next.js (App Router, TypeScript), calls the backend over HTTP.
- **SQLite** — current database. Swap-to-Postgres stays open since the schema is ORM-defined.
- **Auth** — JWT-based, 2 roles (`admin`/`volunteer`) carried in the token, checked via a FastAPI dependency on protected routes. Frontend stores the token and redirects unauthenticated users to a login page; volunteer-role tokens only unlock their own profile/signup endpoints, not admin CRUD.
- **NVIDIA NIM (free tier)** — AI Impact Storyteller.
- **Email** (Resend or plain SMTP) — Communication Center send flow.

## Data model changes for the rebuild

Builds on the existing `backend/app/models.py` (see file for full current schema):

- `Profile` gains `password_hash`, becomes the actual login identity for both roles (`role: admin | volunteer`). Already had the right shape (name/email/role) — just wasn't wired to real auth.
- `Volunteer` gains `profile_id: Optional[int]` FK — links a self-registered login to their operational volunteer record. Admin/staff never need a `Volunteer` row, just a `Profile`.
- `Campaign` gains `category` (enum: education/healthcare/environment/animal_welfare/disaster_relief/womens_empowerment/community_development/child_welfare).
- `Event` gains `category` (enum: fundraising/awareness/community_drive/workshop/training/charity_campaign).
- `EventSignup.status` — the enum already has `suggested/confirmed/attended/no_show`; the apply/accept flow (pending confirmation from you) would repurpose `suggested` as "pending application" and add `rejected`, or similar — finalized once the matching-approach question is answered.

## Phased rebuild plan

**Phase A — Auth foundation.** `Profile.password_hash`, login/register endpoints (JWT), FastAPI auth dependency gating admin-only routes, frontend login page + token storage + route protection. This underlies everything else below.

**Phase B — Volunteer self-service.** Volunteer registration tied to a `Volunteer` record, volunteer-scoped "my profile" / "my hours" / "my signups" views, browse-and-apply flow on events (mechanism pending your answer on the open question above).

**Phase C — Admin surfaces catch-up.** Everything currently admin-only stays working under the new auth gate; add search/filter to donor/volunteer/campaign/event lists; campaign + event category fields; CSV export off analytics.

**Phase D — Surface the differentiators.** AI Impact Storyteller UI (campaign detail page, generate + display narrative/email draft). Volunteer-matching UI, once the mechanism is settled.

**Phase E — Polish & demo prep.** Seed realistic demo data for both roles. Rehearse the demo script (login as admin, login as volunteer, show both sides).

## Verification

- Each phase gets clicked through in a real browser as both roles (admin and volunteer), not just curl-tested.
- Confirm a volunteer-role token genuinely cannot hit admin-only endpoints (401/403), not just that the UI hides the buttons.
- Seed script stays re-runnable so the environment resets cleanly before a live demo.
