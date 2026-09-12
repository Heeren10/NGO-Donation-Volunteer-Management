"""Shared aggregate queries — one batched query per caller instead of one query per row,
and a single definition of each derived number so campaigns/analytics/volunteers can't drift."""
from datetime import date

from sqlmodel import Session, func, select

from app.models import Donation, DonationChannel, Donor, Event, EventSignup, Volunteer


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
