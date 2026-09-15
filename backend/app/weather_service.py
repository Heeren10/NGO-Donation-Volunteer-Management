"""Open-Meteo integration — free, keyless weather/geocoding API. Powers the proactive
disaster-risk check: geocode a place name, pull a short-range forecast, flag severe conditions."""
import httpx

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
REQUEST_TIMEOUT_SECONDS = 10

# WMO weather codes: 65 = heavy rain, 82 = violent rain showers, 95-99 = thunderstorm.
SEVERE_WEATHER_CODES = {65, 82, 95, 96, 99}
HEAVY_RAIN_MM = 40

WEATHER_CODE_LABELS = {65: "Heavy rain", 82: "Violent rain showers", 95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm"}


def geocode_location(name: str) -> dict | None:
    """Resolves a place name to coordinates. Returns None if nothing matches."""
    resp = httpx.get(GEOCODE_URL, params={"name": name, "count": 1}, timeout=REQUEST_TIMEOUT_SECONDS)
    resp.raise_for_status()
    results = resp.json().get("results")
    if not results:
        return None
    match = results[0]
    return {"lat": match["latitude"], "lon": match["longitude"], "display_name": match["name"]}


def check_severe_weather(lat: float, lon: float) -> dict | None:
    """Checks the next 3 days for heavy rain or thunderstorms. Returns None if the forecast is clear."""
    resp = httpx.get(
        FORECAST_URL,
        params={
            "latitude": lat,
            "longitude": lon,
            "daily": "precipitation_sum,weathercode",
            "forecast_days": 3,
            "timezone": "auto",
        },
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    resp.raise_for_status()
    daily = resp.json().get("daily", {})
    dates = daily.get("time", [])
    codes = daily.get("weathercode", [])
    rainfall = daily.get("precipitation_sum", [])

    for day, code, mm in zip(dates, codes, rainfall):
        if code in SEVERE_WEATHER_CODES or mm >= HEAVY_RAIN_MM:
            condition = WEATHER_CODE_LABELS.get(code, "Heavy rainfall")
            return {"date": day, "precipitation_mm": mm, "condition": condition}
    return None
