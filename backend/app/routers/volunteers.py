from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel, select

from app.database import get_session
from app.deps import get_current_profile, require_admin
from app.models import Profile, Role, Volunteer
from app.services import volunteer_hours_totals

router = APIRouter(prefix="/volunteers", tags=["volunteers"], dependencies=[Depends(get_current_profile)])


class VolunteerCreate(SQLModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: Optional[str] = None
    availability: Optional[str] = None
    location: Optional[str] = None


class VolunteerUpdate(SQLModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: Optional[str] = None
    availability: Optional[str] = None
    location: Optional[str] = None


class VolunteerRead(SQLModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    skills: Optional[str]
    availability: Optional[str]
    location: Optional[str]
    total_hours: float


def _with_hours(volunteer: Volunteer, session: Session) -> VolunteerRead:
    hours = volunteer_hours_totals(session, [volunteer.id]).get(volunteer.id, 0)
    return VolunteerRead(**volunteer.model_dump(), total_hours=hours)


def _require_self_or_admin(volunteer: Volunteer, profile: Profile) -> None:
    if profile.role == Role.admin:
        return
    if volunteer.profile_id != profile.id:
        raise HTTPException(status_code=403, detail="You can only access your own volunteer profile")


@router.get("/", response_model=list[VolunteerRead], dependencies=[Depends(require_admin)])
def list_volunteers(session: Session = Depends(get_session)):
    volunteers = session.exec(select(Volunteer)).all()
    hours = volunteer_hours_totals(session, [v.id for v in volunteers])
    return [VolunteerRead(**v.model_dump(), total_hours=hours.get(v.id, 0)) for v in volunteers]


@router.post("/", response_model=Volunteer, dependencies=[Depends(require_admin)])
def create_volunteer(volunteer: VolunteerCreate, session: Session = Depends(get_session)):
    db_volunteer = Volunteer.model_validate(volunteer)
    session.add(db_volunteer)
    session.commit()
    session.refresh(db_volunteer)
    return db_volunteer


@router.get("/{volunteer_id}", response_model=VolunteerRead)
def get_volunteer(
    volunteer_id: int, profile: Profile = Depends(get_current_profile), session: Session = Depends(get_session)
):
    volunteer = session.get(Volunteer, volunteer_id)
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    _require_self_or_admin(volunteer, profile)
    return _with_hours(volunteer, session)


@router.patch("/{volunteer_id}", response_model=VolunteerRead)
def update_volunteer(
    volunteer_id: int,
    update: VolunteerUpdate,
    profile: Profile = Depends(get_current_profile),
    session: Session = Depends(get_session),
):
    volunteer = session.get(Volunteer, volunteer_id)
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    _require_self_or_admin(volunteer, profile)
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(volunteer, field, value)
    session.add(volunteer)
    session.commit()
    session.refresh(volunteer)
    return _with_hours(volunteer, session)


@router.delete("/{volunteer_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_volunteer(volunteer_id: int, session: Session = Depends(get_session)):
    volunteer = session.get(Volunteer, volunteer_id)
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    session.delete(volunteer)
    session.commit()
