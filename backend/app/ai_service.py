import os

from openai import APIError, OpenAI

NVIDIA_MODEL = os.environ.get("NVIDIA_MODEL", "meta/llama-3.1-8b-instruct")
NARRATIVE_MARKER = "###NARRATIVE###"
EMAIL_MARKER = "###EMAIL###"


AI_TIMEOUT_SECONDS = 20

# The SDK retries a timed-out request by default (2 retries), which silently multiplies the
# wait to 3x the timeout and blows past any client-side timeout upstream. A clean failure the
# caller can show beats a retry that's likely to time out again anyway.
def _client() -> OpenAI:
    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key:
        raise RuntimeError(
            "NVIDIA_API_KEY is not set. Get a free key at https://build.nvidia.com and set it "
            "as an environment variable (or in backend/.env) before generating impact reports."
        )
    return OpenAI(
        base_url="https://integrate.api.nvidia.com/v1", api_key=api_key, timeout=AI_TIMEOUT_SECONDS, max_retries=0
    )


def generate_impact_report(stats: dict) -> dict:
    """Turns raw campaign stats into a donor-facing narrative + a personalized thank-you email draft."""
    prompt = f"""You are writing for an NGO's donor communications. Given this campaign data:

Campaign: {stats['name']}
Goal: ₹{stats['goal_amount']}
Raised: ₹{stats['raised_amount']}
Number of donations: {stats['donation_count']}
Events held: {stats['event_count']}
Volunteers involved: {stats['volunteer_count']}
Volunteer hours: {stats['volunteer_hours']}

Use the ₹ (rupee) symbol for all money amounts, never $.

Write two things, separated exactly by the markers below (no extra text before/after):

{NARRATIVE_MARKER}
A short, warm, factual impact narrative (3-5 sentences) suitable for a public campaign page.
{EMAIL_MARKER}
A short personalized thank-you/update email draft to a donor, referencing the impact above.
"""
    try:
        response = _client().chat.completions.create(
            model=NVIDIA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
    except APIError as e:
        raise RuntimeError(f"AI provider request failed: {e}") from e
    text = response.choices[0].message.content or ""

    if NARRATIVE_MARKER in text and EMAIL_MARKER in text:
        narrative = text.split(NARRATIVE_MARKER, 1)[1].split(EMAIL_MARKER, 1)[0].strip()
        email_draft = text.split(EMAIL_MARKER, 1)[1].strip()
    else:
        narrative = text.strip()
        email_draft = ""

    return {"narrative": narrative, "email_draft": email_draft}


GRANT_PROPOSAL_MAX_TOKENS = 3000
GRANT_PROPOSAL_TIMEOUT_SECONDS = 90  # a multi-section document takes far longer than a short narrative


def generate_grant_proposal(stats: dict) -> str:
    """Turns the org's overall track record into a full grant proposal document (markdown),
    ready to hand to a government agency or corporate CSR desk."""
    top_campaigns_lines = "\n".join(
        f"- {c['name']}: ₹{c['raised_amount']} raised of ₹{c['goal_amount']} goal" for c in stats["top_campaigns"]
    ) or "- No campaigns recorded yet"

    prompt = f"""You are a professional grant writer for an NGO. Using ONLY the real data below, write a
complete, submission-ready grant proposal in Markdown. Use the ₹ (rupee) symbol for all money, never $.
Do not invent statistics beyond what's given — where more detail would normally go, write a short
generic sentence instead of a fabricated number.

Organization track record:
- Operating since: {stats['operating_since'] or 'recently founded'}
- Total funds raised to date: ₹{stats['total_raised']}
- Campaigns run: {stats['campaign_count']}
- Top campaigns by funds raised:
{top_campaigns_lines}
- Donors engaged: {stats['donor_count']}
- Volunteers engaged: {stats['volunteer_count']}
- Total volunteer hours contributed: {stats['volunteer_hours_total']}
- Events held: {stats['event_count']}

Structure the proposal with these Markdown sections, in order:
## Executive Summary
## Organization Background & Track Record
## Programs & Impact
## Volunteer Engagement
## Financial Overview
## Future Plans & Funding Request

Keep it substantial (a real multi-page proposal), professional, and factual."""

    try:
        response = _client().chat.completions.create(
            model=NVIDIA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=GRANT_PROPOSAL_MAX_TOKENS,
            timeout=GRANT_PROPOSAL_TIMEOUT_SECONDS,
        )
    except APIError as e:
        raise RuntimeError(f"AI provider request failed: {e}") from e
    return (response.choices[0].message.content or "").strip()


CAMPAIGN_NAME_MARKER = "###NAME###"
CAMPAIGN_DESC_MARKER = "###DESCRIPTION###"


def draft_emergency_campaign(location: str, condition: dict) -> dict:
    """Drafts a short emergency relief campaign name + description in response to a severe
    weather forecast — a human still reviews and creates it, this only saves the blank-page step."""
    prompt = f"""Severe weather is forecast for {location}: {condition['condition']} on {condition['date']}
(expected {condition['precipitation_mm']}mm of rain). Draft a short emergency relief campaign for an NGO
to launch proactively. Write two things, separated exactly by the markers below (no extra text before/after):

{CAMPAIGN_NAME_MARKER}
A short campaign name (5-8 words).
{CAMPAIGN_DESC_MARKER}
A 2-3 sentence description covering what relief is needed and what roles volunteers should sign up for.
"""
    try:
        response = _client().chat.completions.create(
            model=NVIDIA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
    except APIError as e:
        raise RuntimeError(f"AI provider request failed: {e}") from e
    text = response.choices[0].message.content or ""

    if CAMPAIGN_NAME_MARKER in text and CAMPAIGN_DESC_MARKER in text:
        name = text.split(CAMPAIGN_NAME_MARKER, 1)[1].split(CAMPAIGN_DESC_MARKER, 1)[0].strip()
        description = text.split(CAMPAIGN_DESC_MARKER, 1)[1].strip()
    else:
        name = f"Emergency Relief — {location}"
        description = text.strip()

    return {"name": name, "description": description}
