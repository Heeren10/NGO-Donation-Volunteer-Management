from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlmodel import Session, SQLModel, func, select

from app.database import get_session
from app.deps import require_admin
from app.models import Campaign, Donation, Donor, Event, EventSignup, Volunteer
from app.services import campaign_raised_amounts

router = APIRouter(prefix="/analytics", tags=["analytics"], dependencies=[Depends(require_admin)])

LAPSED_AFTER_DAYS = 90


class MonthlyDonations(SQLModel):
    month: str
    amount: float


class CampaignStat(SQLModel):
    id: int
    name: str
    goal_amount: float
    raised_amount: float


class TopDonor(SQLModel):
    id: int
    name: str
    total_donated: float


class AnalyticsSummary(SQLModel):
    total_raised: float
    total_goal: float
    donor_count: int
    volunteer_count: int
    campaign_count: int
    event_count: int
    volunteer_hours_total: float
    lapsed_donors_count: int
    donations_by_month: list[MonthlyDonations]
    campaigns: list[CampaignStat]
    top_donors: list[TopDonor]


@router.get("/summary", response_model=AnalyticsSummary)
def get_summary(session: Session = Depends(get_session)):
    donation_rows = session.exec(
        select(func.strftime("%Y-%m", Donation.date).label("month"), func.sum(Donation.amount))
        .group_by("month")
        .order_by("month")
    ).all()
    donations_by_month = [{"month": month, "amount": amount} for month, amount in donation_rows]

    campaigns = session.exec(select(Campaign)).all()
    raised_by_campaign = campaign_raised_amounts(session, [c.id for c in campaigns])
    campaign_stats = [
        {"id": c.id, "name": c.name, "goal_amount": c.goal_amount, "raised_amount": raised_by_campaign.get(c.id, 0)}
        for c in campaigns
    ]

    top_donors = session.exec(select(Donor).where(Donor.total_donated > 0).order_by(Donor.total_donated.desc()).limit(5)).all()

    cutoff = date.today() - timedelta(days=LAPSED_AFTER_DAYS)
    lapsed_donors_count = session.exec(
        select(func.count(Donor.id)).where(
            Donor.total_donated > 0,
            (Donor.last_donation_date < cutoff) | (Donor.last_donation_date.is_(None)),
        )
    ).one()

    total_raised = session.exec(select(func.coalesce(func.sum(Donation.amount), 0))).one()
    volunteer_hours_total = session.exec(select(func.coalesce(func.sum(EventSignup.hours_logged), 0))).one()

    return {
        "total_raised": total_raised,
        "total_goal": sum(c.goal_amount for c in campaigns),
        "donor_count": session.exec(select(func.count(Donor.id))).one(),
        "volunteer_count": session.exec(select(func.count(Volunteer.id))).one(),
        "campaign_count": len(campaigns),
        "event_count": session.exec(select(func.count(Event.id))).one(),
        "volunteer_hours_total": volunteer_hours_total,
        "lapsed_donors_count": lapsed_donors_count,
        "donations_by_month": donations_by_month,
        "campaigns": campaign_stats,
        "top_donors": [{"id": d.id, "name": d.name, "total_donated": d.total_donated} for d in top_donors],
    }
