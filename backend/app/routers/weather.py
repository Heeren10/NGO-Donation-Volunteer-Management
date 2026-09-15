from fastapi import APIRouter, Depends, HTTPException
from httpx import HTTPError
from sqlmodel import SQLModel

from app.ai_service import draft_emergency_campaign
from app.deps import require_admin
from app.weather_service import check_severe_weather, geocode_location

router = APIRouter(prefix="/weather", tags=["weather"], dependencies=[Depends(require_admin)])


class WeatherAlert(SQLModel):
    date: str
    precipitation_mm: float
    condition: str


class EmergencyCampaignDraft(SQLModel):
    name: str
    description: str


class WeatherCheckResult(SQLModel):
    location: str
    alert: WeatherAlert | None
    draft: EmergencyCampaignDraft | None


@router.get("/check", response_model=WeatherCheckResult)
def check_weather_risk(location: str):
    """Proactive Campaign Prediction: checks a place for severe weather in the next 3 days and,
    if found, has the AI draft an emergency relief campaign a manager can review and launch."""
    try:
        place = geocode_location(location)
    except HTTPError:
        raise HTTPException(status_code=503, detail="Weather service is unreachable right now")
    if not place:
        raise HTTPException(status_code=404, detail=f"Couldn't find a location matching '{location}'")

    try:
        alert = check_severe_weather(place["lat"], place["lon"])
    except HTTPError:
        raise HTTPException(status_code=503, detail="Weather service is unreachable right now")

    draft = None
    if alert:
        try:
            draft = draft_emergency_campaign(place["display_name"], alert)
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e))

    return WeatherCheckResult(location=place["display_name"], alert=alert, draft=draft)
