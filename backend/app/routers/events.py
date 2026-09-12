from datetime import date as date_type
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel, select

from app.database import get_session
from app.deps import get_current_profile, require_admin
from app.models import Event, EventCategory, EventSignup, Volunteer

router = APIRouter(prefix="/events", tags=["events"], dependencies=[Depends(get_current_profile)])

SKILL_MATCH_WEIGHT = 3
LOCATION_MATCH_WEIGHT = 2
MAX_SUGGESTIONS = 10


def _tokenize(value: Optional[str]) -> set[str]:
    if not value:
        return set()
    return {token.strip().lower() for token in value.split(",") if token.strip()}


class VolunteerSuggestion(SQLModel):
    volunteer_id: int
    name: str
    score: int
    matched_skills: list[str]


class EventCreate(SQLModel):
    name: str
    date: date_type
    location: Optional[str] = None
    campaign_id: Optional[int] = None
    category: Optional[EventCategory] = None
    roles_needed: Optional[str] = None


class EventUpdate(SQLModel):
    name: Optional[str] = None
    date: Optional[date_type] = None
    location: Optional[str] = None
    campaign_id: Optional[int] = None
    category: Optional[EventCategory] = None
    roles_needed: Optional[str] = None
    outcome_notes: Optional[str] = None


@router.get("/", response_model=list[Event])
def list_events(session: Session = Depends(get_session)):
    return session.exec(select(Event)).all()


@router.post("/", response_model=Event, dependencies=[Depends(require_admin)])
def create_event(event: EventCreate, session: Session = Depends(get_session)):
    db_event = Event.model_validate(event)
    session.add(db_event)
    session.commit()
    session.refresh(db_event)
    return db_event


@router.get("/{event_id}", response_model=Event)
def get_event(event_id: int, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.patch("/{event_id}", response_model=Event, dependencies=[Depends(require_admin)])
def update_event(event_id: int, update: EventUpdate, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_event(event_id: int, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # EventSignup.event_id is required (not nullable) — an event's signups can't outlive it.
    for signup in session.exec(select(EventSignup).where(EventSignup.event_id == event_id)).all():
        session.delete(signup)

    session.delete(event)
    session.commit()


@router.get(
    "/{event_id}/suggested-volunteers",
    response_model=list[VolunteerSuggestion],
    dependencies=[Depends(require_admin)],
)
def suggest_volunteers(event_id: int, session: Session = Depends(get_session)):
    """Ranks volunteers not yet signed up for this event by skill/location overlap —
    a starting point for staff to invite, not a decision made for them."""
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    needed_skills = _tokenize(event.roles_needed)
    already_signed_up = set(
        session.exec(select(EventSignup.volunteer_id).where(EventSignup.event_id == event_id)).all()
    )

    suggestions = []
    for volunteer in session.exec(select(Volunteer)).all():
        if volunteer.id in already_signed_up:
            continue
        matched = needed_skills & _tokenize(volunteer.skills)
        score = SKILL_MATCH_WEIGHT * len(matched)
        if event.location and volunteer.location and event.location.lower() in volunteer.location.lower():
            score += LOCATION_MATCH_WEIGHT
        if score > 0:
            suggestions.append(
                VolunteerSuggestion(
                    volunteer_id=volunteer.id, name=volunteer.name, score=score, matched_skills=sorted(matched)
                )
            )

    suggestions.sort(key=lambda s: s.score, reverse=True)
    return suggestions[:MAX_SUGGESTIONS]
