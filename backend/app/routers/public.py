"""Unauthenticated endpoints for the public donation page — no login required, since donors
aren't platform users (see PLAN.md's cut list). No real payment gateway is wired up: `record_donation`
just logs the donation as if it succeeded, same as an admin recording an offline donation would."""
import uuid
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel, select

from app.database import get_session
from app.models import Campaign, CampaignStatus, Donation, DonationChannel, Donor
from app.routers.campaigns import CampaignRead
from app.services import campaign_raised_amounts, record_donation

router = APIRouter(prefix="/public", tags=["public"])

PaymentMethod = Literal["card", "upi", "netbanking"]


class DonateRequest(SQLModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    campaign_id: Optional[int] = None
    amount: float
    method: PaymentMethod


class DonationReceipt(SQLModel):
    reference: str
    donor_name: str
    amount: float
    campaign_name: Optional[str]
    date: str


@router.get("/campaigns", response_model=list[CampaignRead])
def list_active_campaigns(session: Session = Depends(get_session)):
    campaigns = session.exec(select(Campaign).where(Campaign.status == CampaignStatus.active)).all()
    raised = campaign_raised_amounts(session, [c.id for c in campaigns])
    return [CampaignRead(**c.model_dump(), raised_amount=raised.get(c.id, 0)) for c in campaigns]


@router.post("/donate", response_model=DonationReceipt)
def donate(payload: DonateRequest, session: Session = Depends(get_session)):
    if payload.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be greater than zero")

    campaign = None
    if payload.campaign_id is not None:
        campaign = session.get(Campaign, payload.campaign_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

    donor = None
    if payload.email:
        donor = session.exec(select(Donor).where(Donor.email == payload.email)).first()
    if not donor:
        donor = Donor(name=payload.name, email=payload.email, phone=payload.phone)
        session.add(donor)
        session.commit()
        session.refresh(donor)

    db_donation: Donation = record_donation(
        session,
        donor,
        amount=payload.amount,
        campaign_id=payload.campaign_id,
        channel=DonationChannel.online,
        method=payload.method,
    )

    return DonationReceipt(
        reference=f"TXN-{uuid.uuid4().hex[:10].upper()}",
        donor_name=donor.name,
        amount=db_donation.amount,
        campaign_name=campaign.name if campaign else None,
        date=db_donation.date.isoformat(),
    )
