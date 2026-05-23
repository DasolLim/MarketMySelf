import os
from typing import Optional
from sqlalchemy.orm import Session

from models.coaching_session import CoachingSession


def _call_llm(prompt: str) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ.get("AI_API_KEY", ""))
    model = os.environ.get("AI_MODEL", "claude-sonnet-4-6")
    message = client.messages.create(
        model=model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def analyze_resume(db: Session, user_id: str, resume_text: str) -> CoachingSession:
    prompt = (
        "You are a professional career coach. Review the following resume and provide "
        "structured, actionable feedback on: clarity, impact of achievements, skills "
        "presentation, and areas to improve. Be specific and concise.\n\n"
        f"RESUME:\n{resume_text}"
    )
    feedback = _call_llm(prompt)
    session = CoachingSession(
        user_id=user_id,
        type="resume",
        input_text=resume_text[:5000],
        feedback=feedback,
    )
    db.add(session)
    db.flush()
    return session


def generate_interview_questions(
    db: Session,
    user_id: str,
    job_category: Optional[str],
    skills: Optional[list[str]] = None,
) -> CoachingSession:
    skills_str = ", ".join(skills or []) if skills else "general"
    prompt = (
        f"Generate 8 targeted interview questions for a {job_category or 'general'} role. "
        f"The candidate has skills in: {skills_str}. "
        "Include a mix of behavioral, technical, and situational questions. "
        "Format as a numbered list. No extra commentary."
    )
    raw = _call_llm(prompt)
    questions = [line.strip() for line in raw.splitlines() if line.strip()]
    session = CoachingSession(
        user_id=user_id,
        type="interview",
        input_text=f"category={job_category}, skills={skills_str}",
        questions=questions,
    )
    db.add(session)
    db.flush()
    return session
