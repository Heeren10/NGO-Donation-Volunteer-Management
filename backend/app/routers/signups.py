from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel, select

from app.database import get_session
from app.deps import get_current_profile
from app.models import Event, EventSignup, Profile, Role, SignupStatus, Volunteer
from app.services import event_names, volunteer_names

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
    volunteer_name: Optional[str] = None


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
    e_names = event_names(session, [s.event_id for s in signups])
    v_names = volunteer_names(session, [s.volunteer_id for s in signups])
    return [
        SignupRead(**s.model_dump(), event_name=e_names.get(s.event_id), volunteer_name=v_names.get(s.volunteer_id))
        for s in signups
    ]


@router.post("/", response_model=EventSignup)
def apply_to_event(
    signup: SignupCreate,
    profile: Profile = Depends(get_current_profile),
    session: Session = Depends(get_session),
):
    """Two paths to the same table: a volunteer applies (pending, awaits staff review) or
    staff directly invites a suggested volunteer (confirmed immediately — already vetted)."""
    if not session.get(Event, signup.event_id):
        raise HTTPException(status_code=404, detail="Event not found")

    if profile.role == Role.admin:
        if signup.volunteer_id is None:
            raise HTTPException(status_code=422, detail="volunteer_id is required for admin-created signups")
        if not session.get(Volunteer, signup.volunteer_id):
            raise HTTPException(status_code=404, detail="Volunteer not found")
        volunteer_id = signup.volunteer_id
        status = SignupStatus.confirmed
    else:
        own = _own_volunteer(profile, session)
        if not own:
            raise HTTPException(status_code=404, detail="No volunteer profile linked to this account")
        volunteer_id = own.id
        status = SignupStatus.pending

    already_exists = session.exec(
        select(EventSignup).where(EventSignup.event_id == signup.event_id, EventSignup.volunteer_id == volunteer_id)
    ).first()
    if already_exists:
        raise HTTPException(status_code=409, detail="This volunteer already has a signup for this event")

    db_signup = EventSignup(event_id=signup.event_id, volunteer_id=volunteer_id, role=signup.role, status=status)
    session.add(db_signup)
    session.commit()
    session.refresh(db_signup)
    return db_signup


@router.patch("/{signup_id}", response_model=EventSignup)
def update_signup(
    signup_id: int,
    update: SignupUpdate,
    profile: Profile = Depends(get_current_profile),
    session: Session = Depends(get_session),
):
    """Staff accepts/rejects an application, marks attendance once the event has happened, or
    cancels a signup before it does. A volunteer may only cancel their own signup the same way."""
    signup = session.get(EventSignup, signup_id)
    if not signup:
        raise HTTPException(status_code=404, detail="Signup not found")

    event = session.get(Event, signup.event_id)
    event_has_passed = bool(event and event.date <= date.today())

    if profile.role == Role.admin:
        if update.status in (SignupStatus.attended, SignupStatus.no_show) and not event_has_passed:
            raise HTTPException(status_code=422, detail="Can't record attendance before the event date")
        if update.status == SignupStatus.cancelled and event_has_passed:
            raise HTTPException(status_code=409, detail="Can't cancel a signup after the event has happened")
    else:
        own = _own_volunteer(profile, session)
        if not own or own.id != signup.volunteer_id:
            raise HTTPException(status_code=403, detail="You can only manage your own signups")
        if update.status != SignupStatus.cancelled or update.hours_logged is not None:
            raise HTTPException(status_code=403, detail="Volunteers can only cancel their own signup")
        if signup.status not in (SignupStatus.pending, SignupStatus.confirmed):
            raise HTTPException(status_code=409, detail="This signup can no longer be cancelled")
        if event_has_passed:
            raise HTTPException(status_code=409, detail="Can't cancel a signup after the event has happened")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(signup, field, value)

    session.add(signup)
    session.commit()
    session.refresh(signup)
    return signup
