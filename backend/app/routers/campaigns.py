from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel, func, select

from app.ai_service import generate_impact_report
from app.database import get_session
from app.deps import get_current_profile, require_admin
from app.models import Campaign, CampaignCategory, CampaignStatus, Donation, Event, EventSignup, ImpactReport

router = APIRouter(prefix="/campaigns", tags=["campaigns"], dependencies=[Depends(get_current_profile)])


class CampaignCreate(SQLModel):
    name: str
    goal_amount: float
    start_date: date
    end_date: Optional[date] = None
    status: CampaignStatus = CampaignStatus.draft
    category: Optional[CampaignCategory] = None


class CampaignRead(SQLModel):
    id: int
    name: str
    goal_amount: float
    start_date: date
    end_date: Optional[date]
    status: CampaignStatus
    category: Optional[CampaignCategory]
    raised_amount: float


def _with_raised(campaign: Campaign, session: Session) -> CampaignRead:
    raised = session.exec(
        select(func.coalesce(func.sum(Donation.amount), 0)).where(Donation.campaign_id == campaign.id)
    ).one()
    return CampaignRead(**campaign.model_dump(), raised_amount=raised)


@router.get("/", response_model=list[CampaignRead])
def list_campaigns(session: Session = Depends(get_session)):
    campaigns = session.exec(select(Campaign)).all()
    return [_with_raised(c, session) for c in campaigns]


@router.post("/", response_model=Campaign, dependencies=[Depends(require_admin)])
def create_campaign(campaign: CampaignCreate, session: Session = Depends(get_session)):
    db_campaign = Campaign.model_validate(campaign)
    session.add(db_campaign)
    session.commit()
    session.refresh(db_campaign)
    return db_campaign


@router.get("/{campaign_id}", response_model=CampaignRead)
def get_campaign(campaign_id: int, session: Session = Depends(get_session)):
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return _with_raised(campaign, session)


def _gather_stats(campaign: Campaign, session: Session) -> dict:
    donation_count, raised_amount = session.exec(
        select(func.count(Donation.id), func.coalesce(func.sum(Donation.amount), 0)).where(
            Donation.campaign_id == campaign.id
        )
    ).one()

    event_ids = session.exec(select(Event.id).where(Event.campaign_id == campaign.id)).all()
    volunteer_count, volunteer_hours = (0, 0.0)
    if event_ids:
        volunteer_count = session.exec(
            select(func.count(func.distinct(EventSignup.volunteer_id))).where(
                EventSignup.event_id.in_(event_ids)
            )
        ).one()
        volunteer_hours = session.exec(
            select(func.coalesce(func.sum(EventSignup.hours_logged), 0)).where(
                EventSignup.event_id.in_(event_ids)
            )
        ).one()

    return {
        "name": campaign.name,
        "goal_amount": campaign.goal_amount,
        "raised_amount": raised_amount,
        "donation_count": donation_count,
        "event_count": len(event_ids),
        "volunteer_count": volunteer_count,
        "volunteer_hours": volunteer_hours,
    }


@router.post("/{campaign_id}/impact-report", response_model=ImpactReport, dependencies=[Depends(require_admin)])
def create_impact_report(campaign_id: int, session: Session = Depends(get_session)):
    """AI Impact Storyteller: turns this campaign's raw stats into a narrative + donor email draft."""
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    try:
        result = generate_impact_report(_gather_stats(campaign, session))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    content = f"{result['narrative']}\n\n---EMAIL DRAFT---\n{result['email_draft']}"
    report = ImpactReport(campaign_id=campaign_id, generated_content=content)
    session.add(report)
    session.commit()
    session.refresh(report)
    return report


@router.get("/{campaign_id}/impact-report", response_model=ImpactReport)
def get_latest_impact_report(campaign_id: int, session: Session = Depends(get_session)):
    report = session.exec(
        select(ImpactReport)
        .where(ImpactReport.campaign_id == campaign_id)
        .order_by(ImpactReport.generated_at.desc())
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="No impact report generated yet for this campaign")
    return report
