"""Shared aggregate queries — one batched query per caller instead of one query per row,
and a single definition of each derived number so campaigns/analytics/volunteers can't drift."""
from datetime import date

from sqlmodel import Session, func, select

from app.models import Campaign, CampaignStatus, Donation, DonationChannel, Donor, Event, EventSignup, Volunteer


def campaign_raised_amounts(session: Session, campaign_ids: list[int] | None = None) -> dict[int, float]:
    query = select(Donation.campaign_id, func.coalesce(func.sum(Donation.amount), 0)).group_by(Donation.campaign_id)
    if campaign_ids is not None:
        query = query.where(Donation.campaign_id.in_(campaign_ids))
    return {cid: amount for cid, amount in session.exec(query).all() if cid is not None}


def volunteer_hours_totals(session: Session, volunteer_ids: list[int] | None = None) -> dict[int, float]:
    query = select(EventSignup.volunteer_id, func.coalesce(func.sum(EventSignup.hours_logged), 0)).group_by(
        EventSignup.volunteer_id
    )
    if volunteer_ids is not None:
        query = query.where(EventSignup.volunteer_id.in_(volunteer_ids))
    return dict(session.exec(query).all())


def event_names(session: Session, event_ids: list[int]) -> dict[int, str]:
    if not event_ids:
        return {}
    return dict(session.exec(select(Event.id, Event.name).where(Event.id.in_(event_ids))).all())


def volunteer_names(session: Session, volunteer_ids: list[int]) -> dict[int, str]:
    if not volunteer_ids:
        return {}
    return dict(session.exec(select(Volunteer.id, Volunteer.name).where(Volunteer.id.in_(volunteer_ids))).all())


def record_donation(
    session: Session,
    donor: Donor,
    *,
    amount: float,
    campaign_id: int | None,
    channel: DonationChannel,
    method: str | None,
    recurring: bool = False,
    on_date: date | None = None,
) -> Donation:
    """Creates a Donation and keeps Donor.total_donated / last_donation_date in sync —
    the one place that touches both tables, so admin-recorded and public donations can't drift apart."""
    on_date = on_date or date.today()
    db_donation = Donation(
        donor_id=donor.id,
        campaign_id=campaign_id,
        amount=amount,
        date=on_date,
        channel=channel,
        method=method,
        recurring=recurring,
    )
    session.add(db_donation)

    donor.total_donated += amount
    if not donor.last_donation_date or on_date > donor.last_donation_date:
        donor.last_donation_date = on_date
    session.add(donor)

    session.commit()
    session.refresh(db_donation)
    return db_donation


def sync_campaign_status(session: Session, campaign: Campaign, raised_amount: float) -> Campaign:
    """Auto-promotes an active campaign to completed once it's fully funded or past its end date.
    Draft campaigns are left alone — activating one is a deliberate admin action."""
    if campaign.status == CampaignStatus.active and (
        raised_amount >= campaign.goal_amount or (campaign.end_date and campaign.end_date < date.today())
    ):
        campaign.status = CampaignStatus.completed
        session.add(campaign)
        session.commit()
        session.refresh(campaign)
    return campaign


def gather_org_stats(session: Session) -> dict:
    """Org-wide track record — the raw numbers a grant proposal is built from."""
    campaigns = session.exec(select(Campaign)).all()
    raised_by_campaign = campaign_raised_amounts(session, [c.id for c in campaigns])
    top_campaigns = sorted(
        (
            {"name": c.name, "goal_amount": c.goal_amount, "raised_amount": raised_by_campaign.get(c.id, 0)}
            for c in campaigns
        ),
        key=lambda c: c["raised_amount"],
        reverse=True,
    )[:5]

    total_raised = session.exec(select(func.coalesce(func.sum(Donation.amount), 0))).one()
    volunteer_hours_total = session.exec(select(func.coalesce(func.sum(EventSignup.hours_logged), 0))).one()
    earliest_campaign_start = session.exec(select(func.min(Campaign.start_date))).one()

    return {
        "total_raised": total_raised,
        "campaign_count": len(campaigns),
        "top_campaigns": top_campaigns,
        "donor_count": session.exec(select(func.count(Donor.id))).one(),
        "volunteer_count": session.exec(select(func.count(Volunteer.id))).one(),
        "volunteer_hours_total": volunteer_hours_total,
        "event_count": session.exec(select(func.count(Event.id))).one(),
        "operating_since": earliest_campaign_start.isoformat() if earliest_campaign_start else None,
    }
