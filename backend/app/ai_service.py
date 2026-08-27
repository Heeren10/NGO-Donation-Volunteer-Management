import os

from openai import OpenAI

NVIDIA_MODEL = os.environ.get("NVIDIA_MODEL", "meta/llama-3.1-8b-instruct")
NARRATIVE_MARKER = "###NARRATIVE###"
EMAIL_MARKER = "###EMAIL###"


def _client() -> OpenAI:
    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key:
        raise RuntimeError(
            "NVIDIA_API_KEY is not set. Get a free key at https://build.nvidia.com and set it "
            "as an environment variable (or in backend/.env) before generating impact reports."
        )
    return OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=api_key)


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
    response = _client().chat.completions.create(
        model=NVIDIA_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    text = response.choices[0].message.content or ""

    if NARRATIVE_MARKER in text and EMAIL_MARKER in text:
        narrative = text.split(NARRATIVE_MARKER, 1)[1].split(EMAIL_MARKER, 1)[0].strip()
        email_draft = text.split(EMAIL_MARKER, 1)[1].strip()
    else:
        narrative = text.strip()
        email_draft = ""

    return {"narrative": narrative, "email_draft": email_draft}
