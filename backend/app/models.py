from datetime import date, datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class Role(str, Enum):
    admin = "admin"
    volunteer = "volunteer"


class DonationChannel(str, Enum):
    online = "online"
    offline = "offline"


class CampaignStatus(str, Enum):
    draft = "draft"
    active = "active"
    completed = "completed"


class CampaignCategory(str, Enum):
    education = "education"
    healthcare = "healthcare"
    environment = "environment"
    animal_welfare = "animal_welfare"
    disaster_relief = "disaster_relief"
    womens_empowerment = "womens_empowerment"
    community_development = "community_development"
    child_welfare = "child_welfare"


class EventCategory(str, Enum):
    fundraising = "fundraising"
    awareness = "awareness"
    community_drive = "community_drive"
    workshop = "workshop"
    training = "training"
    charity_campaign = "charity_campaign"


class SignupStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    rejected = "rejected"
    attended = "attended"
    no_show = "no_show"


class CommChannel(str, Enum):
    email = "email"
    sms = "sms"


class Profile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True, index=True)
    password_hash: str
    role: Role = Role.volunteer


class Donor(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: Optional[str] = Field(default=None, index=True)
    phone: Optional[str] = None
    tags: Optional[str] = None
    is_recurring: bool = False
    total_donated: float = 0
    last_donation_date: Optional[date] = None


class Campaign(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    goal_amount: float
    start_date: date
    end_date: Optional[date] = None
    status: CampaignStatus = CampaignStatus.draft
    category: Optional[CampaignCategory] = None


class Donation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    donor_id: int = Field(foreign_key="donor.id")
    campaign_id: Optional[int] = Field(default=None, foreign_key="campaign.id")
    amount: float
    date: date
    channel: DonationChannel = DonationChannel.online
    method: Optional[str] = None
    receipt_url: Optional[str] = None
    recurring: bool = False


class Volunteer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    profile_id: Optional[int] = Field(default=None, foreign_key="profile.id", unique=True)
    name: str
    email: Optional[str] = Field(default=None, index=True)
    phone: Optional[str] = None
    skills: Optional[str] = None
    availability: Optional[str] = None
    location: Optional[str] = None


class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    date: date
    location: Optional[str] = None
    campaign_id: Optional[int] = Field(default=None, foreign_key="campaign.id")
    category: Optional[EventCategory] = None
    roles_needed: Optional[str] = None
    outcome_notes: Optional[str] = None


class EventSignup(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="event.id")
    volunteer_id: int = Field(foreign_key="volunteer.id")
    role: Optional[str] = None
    status: SignupStatus = SignupStatus.pending
    hours_logged: float = 0


class Communication(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    donor_id: Optional[int] = Field(default=None, foreign_key="donor.id")
    volunteer_id: Optional[int] = Field(default=None, foreign_key="volunteer.id")
    channel: CommChannel = CommChannel.email
    content: str
    sent_at: datetime = Field(default_factory=datetime.utcnow)


class ImpactReport(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    campaign_id: int = Field(foreign_key="campaign.id")
    generated_content: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class GrantProposal(SQLModel, table=True):
    """Org-wide (not per-campaign) — built from the NGO's overall track record."""
    id: Optional[int] = Field(default=None, primary_key=True)
    generated_content: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
