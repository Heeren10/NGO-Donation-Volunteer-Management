from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel, select

from app.database import get_session
from app.deps import require_admin
from app.models import CommChannel, Communication, Donor, Volunteer

router = APIRouter(prefix="/communications", tags=["communications"], dependencies=[Depends(require_admin)])


class CommunicationCreate(SQLModel):
    donor_id: Optional[int] = None
    volunteer_id: Optional[int] = None
    channel: CommChannel = CommChannel.email
    content: str


@router.get("/", response_model=list[Communication])
def list_communications(
    donor_id: Optional[int] = None,
    volunteer_id: Optional[int] = None,
    session: Session = Depends(get_session),
):
    query = select(Communication)
    if donor_id is not None:
        query = query.where(Communication.donor_id == donor_id)
    if volunteer_id is not None:
        query = query.where(Communication.volunteer_id == volunteer_id)
    return session.exec(query).all()


@router.post("/", response_model=Communication)
def send_communication(comm: CommunicationCreate, session: Session = Depends(get_session)):
    """Logs the communication as sent. ponytail: no real email/SMS transport wired up yet
    (needs a Resend/SMTP API key) — this records what was sent so the Communication
    Center UI and history are real; plug in actual delivery when credentials exist.
    """
    if comm.donor_id is not None and not session.get(Donor, comm.donor_id):
        raise HTTPException(status_code=404, detail="Donor not found")
    if comm.volunteer_id is not None and not session.get(Volunteer, comm.volunteer_id):
        raise HTTPException(status_code=404, detail="Volunteer not found")

    db_comm = Communication.model_validate(comm, update={"sent_at": datetime.utcnow()})
    session.add(db_comm)
    session.commit()
    session.refresh(db_comm)
    return db_comm
