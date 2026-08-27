from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel, select

from app.database import get_session
from app.deps import get_current_profile, require_admin
from app.models import Event, EventCategory

router = APIRouter(prefix="/events", tags=["events"], dependencies=[Depends(get_current_profile)])


class EventCreate(SQLModel):
    name: str
    date: date
    location: Optional[str] = None
    campaign_id: Optional[int] = None
    category: Optional[EventCategory] = None
    roles_needed: Optional[str] = None


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
