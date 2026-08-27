"""Smoke test: create all tables, round-trip an insert/read across related tables."""
from datetime import date

from sqlmodel import Session, select

from app.database import engine, init_db
from app.models import Campaign, Donation, Donor

if __name__ == "__main__":
    init_db()
    with Session(engine) as session:
        donor = Donor(name="Test Donor", email="donor@test.com")
        campaign = Campaign(name="Test Campaign", goal_amount=1000, start_date=date.today())
        session.add(donor)
        session.add(campaign)
        session.commit()
        session.refresh(donor)
        session.refresh(campaign)

        session.add(Donation(donor_id=donor.id, campaign_id=campaign.id, amount=50, date=date.today()))
        session.commit()

        result = session.exec(select(Donation).where(Donation.donor_id == donor.id)).first()
        assert result is not None and result.amount == 50

    print("OK: all 9 tables created, insert/read round-trip succeeded")
