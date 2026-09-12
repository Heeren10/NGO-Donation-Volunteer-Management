import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.auth import decode_access_token
from app.database import get_session
from app.models import Profile, Role, Volunteer

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_profile(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> Profile:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    profile = session.get(Profile, int(payload["sub"]))
    if not profile:
        raise HTTPException(status_code=401, detail="Invalid token")
    return profile


def require_admin(profile: Profile = Depends(get_current_profile)) -> Profile:
    if profile.role != Role.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return profile


def get_current_volunteer(
    profile: Profile = Depends(get_current_profile),
    session: Session = Depends(get_session),
) -> Volunteer:
    if profile.role != Role.volunteer:
        raise HTTPException(status_code=403, detail="Volunteer access required")
    volunteer = session.exec(select(Volunteer).where(Volunteer.profile_id == profile.id)).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="No volunteer profile linked to this account")
    return volunteer
