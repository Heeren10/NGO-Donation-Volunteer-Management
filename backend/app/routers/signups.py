from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel, select

from app.database import get_session
from app.deps import get_current_profile, require_admin
from app.models import Event, EventSignup, Profile, Role, SignupStatus, Volunteer

router = APIRouter(prefix="/signups", tags=["signups"], dependencies=[Depends(get_current_profile)])


class SignupCreate(SQLModel):
    event_id: int
    volunteer_id: Optional[int] = None  # admin only — volunteers always apply as themselves
    role: Optional[str] = None


class SignupUpdate(SQLModel):
    status: Optional[SignupStatus] = None
    hours_logged: Optional[float] = None


class SignupRead(SQLModel):
    id: int
    event_id: int
    volunteer_id: int
    role: Optional[str]
    status: SignupStatus
    hours_logged: float
    event_name: Optional[str] = None


def _own_volunteer(profile: Profile, session: Session) -> Optional[Volunteer]:
    return session.exec(select(Volunteer).where(Volunteer.profile_id == profile.id)).first()


@router.get("/", response_model=list[SignupRead])
def list_signups(
    event_id: Optional[int] = None,
    volunteer_id: Optional[int] = None,
    profile: Profile = Depends(get_current_profile),
    session: Session = Depends(get_session),
):
    query = select(EventSignup)
    if event_id is not None:
        query = query.where(EventSignup.event_id == event_id)

    if profile.role == Role.admin:
        if volunteer_id is not None:
            query = query.where(EventSignup.volunteer_id == volunteer_id)
    else:
        own = _own_volunteer(profile, session)
        query = query.where(EventSignup.volunteer_id == (own.id if own else -1))

    signups = session.exec(query).all()
    results = []
    for s in signups:
        event = session.get(Event, s.event_id)
        results.append(SignupRead(**s.model_dump(), event_name=event.name if event else None))
    return results


@router.post("/", response_model=EventSignup)
def apply_to_event(
    signup: SignupCreate,
    profile: Profile = Depends(get_current_profile),
    session: Session = Depends(get_session),
):
    """Volunteer-to-event matching: a volunteer applies, staff accepts/rejects — no scoring algorithm."""
    if not session.get(Event, signup.event_id):
        raise HTTPException(status_code=404, detail="Event not found")

    if profile.role == Role.admin:
        if signup.volunteer_id is None:
            raise HTTPException(status_code=422, detail="volunteer_id is required for admin-created signups")
        if not session.get(Volunteer, signup.volunteer_id):
            raise HTTPException(status_code=404, detail="Volunteer not found")
        volunteer_id = signup.volunteer_id
    else:
        own = _own_volunteer(profile, session)
        if not own:
            raise HTTPException(status_code=404, detail="No volunteer profile linked to this account")
        volunteer_id = own.id

    db_signup = EventSignup(
        event_id=signup.event_id, volunteer_id=volunteer_id, role=signup.role, status=SignupStatus.pending
    )
    session.add(db_signup)
    session.commit()
    session.refresh(db_signup)
    return db_signup


@router.patch("/{signup_id}", response_model=EventSignup, dependencies=[Depends(require_admin)])
def update_signup(signup_id: int, update: SignupUpdate, session: Session = Depends(get_session)):
    """Staff accepts/rejects an application, or marks attendance + logs hours."""
    signup = session.get(EventSignup, signup_id)
    if not signup:
        raise HTTPException(status_code=404, detail="Signup not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(signup, field, value)

    session.add(signup)
    session.commit()
    session.refresh(signup)
    return signup
