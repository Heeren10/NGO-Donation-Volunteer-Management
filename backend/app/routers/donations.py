from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel, select

from app.database import get_session
from app.deps import require_admin
from app.models import Donation, DonationChannel, Donor

router = APIRouter(prefix="/donations", tags=["donations"], dependencies=[Depends(require_admin)])


class DonationCreate(SQLModel):
    donor_id: int
    campaign_id: Optional[int] = None
    amount: float
    date: Optional[date] = None
    channel: DonationChannel = DonationChannel.online
    method: Optional[str] = None
    recurring: bool = False


@router.get("/", response_model=list[Donation])
def list_donations(donor_id: Optional[int] = None, session: Session = Depends(get_session)):
    query = select(Donation)
    if donor_id is not None:
        query = query.where(Donation.donor_id == donor_id)
    return session.exec(query.order_by(Donation.date.desc())).all()


@router.post("/", response_model=Donation)
def create_donation(donation: DonationCreate, session: Session = Depends(get_session)):
    donor = session.get(Donor, donation.donor_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")

    donation_date = donation.date or date.today()
    db_donation = Donation.model_validate(donation, update={"date": donation_date})
    session.add(db_donation)

    donor.total_donated += donation.amount
    if not donor.last_donation_date or donation_date > donor.last_donation_date:
        donor.last_donation_date = donation_date
    session.add(donor)

    session.commit()
    session.refresh(db_donation)
    return db_donation
