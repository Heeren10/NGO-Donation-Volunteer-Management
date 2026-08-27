from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel, select

from app.database import get_session
from app.deps import require_admin
from app.models import Donor

router = APIRouter(prefix="/donors", tags=["donors"], dependencies=[Depends(require_admin)])


class DonorCreate(SQLModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    tags: Optional[str] = None
    is_recurring: bool = False


class DonorUpdate(SQLModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    tags: Optional[str] = None
    is_recurring: Optional[bool] = None


@router.get("/", response_model=list[Donor])
def list_donors(session: Session = Depends(get_session)):
    return session.exec(select(Donor)).all()


@router.post("/", response_model=Donor)
def create_donor(donor: DonorCreate, session: Session = Depends(get_session)):
    db_donor = Donor.model_validate(donor)
    session.add(db_donor)
    session.commit()
    session.refresh(db_donor)
    return db_donor


@router.get("/{donor_id}", response_model=Donor)
def get_donor(donor_id: int, session: Session = Depends(get_session)):
    donor = session.get(Donor, donor_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    return donor


@router.patch("/{donor_id}", response_model=Donor)
def update_donor(donor_id: int, update: DonorUpdate, session: Session = Depends(get_session)):
    donor = session.get(Donor, donor_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(donor, field, value)
    session.add(donor)
    session.commit()
    session.refresh(donor)
    return donor


@router.delete("/{donor_id}", status_code=204)
def delete_donor(donor_id: int, session: Session = Depends(get_session)):
    donor = session.get(Donor, donor_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    session.delete(donor)
    session.commit()
