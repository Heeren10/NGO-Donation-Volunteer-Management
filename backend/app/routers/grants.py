from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.ai_service import generate_grant_proposal
from app.database import get_session
from app.deps import require_admin
from app.models import GrantProposal
from app.services import gather_org_stats

router = APIRouter(prefix="/grants", tags=["grants"], dependencies=[Depends(require_admin)])


@router.post("/proposal", response_model=GrantProposal)
def create_grant_proposal(session: Session = Depends(get_session)):
    """AI Grant Proposal Generator: turns the org's real track record into a submission-ready draft."""
    try:
        content = generate_grant_proposal(gather_org_stats(session))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    proposal = GrantProposal(generated_content=content)
    session.add(proposal)
    session.commit()
    session.refresh(proposal)
    return proposal


@router.get("/proposal", response_model=GrantProposal)
def get_latest_grant_proposal(session: Session = Depends(get_session)):
    proposal = session.exec(select(GrantProposal).order_by(GrantProposal.generated_at.desc())).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="No grant proposal generated yet")
    return proposal
