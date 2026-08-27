from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel, select

from app.auth import create_access_token, hash_password, verify_password
from app.database import get_session
from app.deps import get_current_profile
from app.models import Profile, Role, Volunteer

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterVolunteer(SQLModel):
    name: str
    email: str
    password: str
    skills: Optional[str] = None
    availability: Optional[str] = None
    location: Optional[str] = None


class Login(SQLModel):
    email: str
    password: str


class TokenResponse(SQLModel):
    access_token: str
    role: Role
    profile_id: int


class MeResponse(SQLModel):
    id: int
    name: str
    email: str
    role: Role
    volunteer_id: Optional[int] = None


@router.post("/register", response_model=TokenResponse)
def register_volunteer(data: RegisterVolunteer, session: Session = Depends(get_session)):
    if session.exec(select(Profile).where(Profile.email == data.email)).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    profile = Profile(name=data.name, email=data.email, password_hash=hash_password(data.password), role=Role.volunteer)
    session.add(profile)
    session.commit()
    session.refresh(profile)

    volunteer = Volunteer(
        profile_id=profile.id,
        name=data.name,
        email=data.email,
        skills=data.skills,
        availability=data.availability,
        location=data.location,
    )
    session.add(volunteer)
    session.commit()

    token = create_access_token(profile.id, profile.role.value)
    return TokenResponse(access_token=token, role=profile.role, profile_id=profile.id)


@router.post("/login", response_model=TokenResponse)
def login(data: Login, session: Session = Depends(get_session)):
    profile = session.exec(select(Profile).where(Profile.email == data.email)).first()
    if not profile or not verify_password(data.password, profile.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token(profile.id, profile.role.value)
    return TokenResponse(access_token=token, role=profile.role, profile_id=profile.id)


@router.get("/me", response_model=MeResponse)
def me(profile: Profile = Depends(get_current_profile), session: Session = Depends(get_session)):
    volunteer = session.exec(select(Volunteer).where(Volunteer.profile_id == profile.id)).first()
    return MeResponse(
        id=profile.id,
        name=profile.name,
        email=profile.email,
        role=profile.role,
        volunteer_id=volunteer.id if volunteer else None,
    )
