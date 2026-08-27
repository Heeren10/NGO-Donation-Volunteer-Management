import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv

load_dotenv()

from sqlmodel import Session, select

from app.auth import hash_password
from app.database import engine, init_db
from app.models import Profile, Role
from app.routers import analytics, auth, campaigns, communications, donations, donors, events, signups, volunteers

app = FastAPI(title="NGO Management Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(donors.router)
app.include_router(campaigns.router)
app.include_router(donations.router)
app.include_router(volunteers.router)
app.include_router(events.router)
app.include_router(signups.router)
app.include_router(communications.router)
app.include_router(analytics.router)


def bootstrap_admin() -> None:
    """Seeds a default admin account on first run so there's always a way in."""
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@ngo.local")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    with Session(engine) as session:
        if session.exec(select(Profile).where(Profile.role == Role.admin)).first():
            return
        session.add(Profile(name="Admin", email=admin_email, password_hash=hash_password(admin_password), role=Role.admin))
        session.commit()
        print(f"Seeded default admin account: {admin_email} / {admin_password}")


@app.on_event("startup")
def on_startup():
    init_db()
    bootstrap_admin()


@app.get("/health")
def health():
    return {"status": "ok"}
