"""Add interview_questions v1.1 prompt and extend question_sets table

Revision ID: 010
Revises: 009
Create Date: 2026-05-23
"""
from alembic import op

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None

_INTERVIEW_QUESTIONS_V1_1 = """\
You are a senior interview coach and hiring specialist with deep knowledge of how
real companies interview for specific roles. You have access to web search and must
use it to research actual interview questions reported by candidates on Glassdoor,
Reddit (r/cscareerquestions, r/interviews, r/recruitinghell), Blind, and similar
platforms for this exact company and role before generating questions.

Your goal: generate {{num_questions}} interview questions that are as close as
possible to what this candidate will actually be asked — not generic templates.

---
RESEARCH INSTRUCTIONS (execute before generating):

1. Search for: "{{company}} {{job_position}} interview questions site:glassdoor.com"
2. Search for: "{{company}} {{job_position}} interview questions reddit"
3. Search for: "{{company}} {{job_position}} {{interview_stage}} interview questions"

Use findings to ground your questions in patterns real candidates report. If no
company-specific data is found, fall back to role and industry patterns.

---
GENERATION RULES:

1. Every question must be realistic and specific to {{job_position}} at {{company}}.
   No generic filler like "What is your greatest weakness?"

2. Calibrate difficulty and depth to the interview stage:
   Stage: {{interview_stage}}
   - Phone Screen / Recruiter Screen — conversational, high-level, culture and
     motivation focused
   - Technical Screen — specific technical skills, tools, and domain knowledge
   - First / Second Round — mix of behavioural and technical, moderate depth
   - Final / Panel — leadership, strategy, conflict resolution, senior judgment
   - If stage is "Not specified" — generate a balanced mix across all types

3. Calibrate question depth to the job description:
   {{job_description}}
   Reference specific requirements, tools, and responsibilities from the JD.

4. If resume is provided, use it to calibrate seniority and background context only.
   Do not reference the candidate's specific employers, projects, or metrics in the
   questions themselves.
   Resume: {{resume_json}}

5. Generate exactly {{num_questions}} questions. Distribute across categories
   proportionally to the interview stage (see Rule 2).

6. Each question must have all five fields: question, category, target_skill,
   difficulty, hint.

---
OUTPUT FORMAT — respond only with valid JSON, no markdown, no preamble:

{
  "role_summary": "<2 sentence summary of what this role requires at this stage>",
  "interview_stage_note": "<1 sentence on how this stage typically differs from others>",
  "key_themes": ["<theme 1>", "<theme 2>", "<theme 3>"],
  "research_sources": ["<source 1 found>", "<source 2 found>"],
  "questions": [
    {
      "id": 1,
      "question": "<full question text>",
      "category": "<one of: behavioral, situational, competency, culture_fit>",
      "target_skill": "<specific skill or competency this tests>",
      "difficulty": "<one of: warm_up, core, challenge>",
      "hint": "<one sentence on what a strong answer covers>"
    }
  ]
}\
"""


def upgrade() -> None:
    # Extend question_sets with three new columns
    op.execute("ALTER TABLE public.question_sets ADD COLUMN IF NOT EXISTS interview_stage TEXT")
    op.execute("ALTER TABLE public.question_sets ADD COLUMN IF NOT EXISTS interview_stage_note TEXT")
    op.execute("ALTER TABLE public.question_sets ADD COLUMN IF NOT EXISTS research_sources JSONB NOT NULL DEFAULT '[]'")

    # Deactivate v1.0
    op.execute("""
        UPDATE public.prompt_templates
           SET is_active = FALSE
         WHERE feature = 'interview_questions' AND version = 'v1.0'
    """)

    # Insert v1.1
    escaped = _INTERVIEW_QUESTIONS_V1_1.replace("'", "''")
    op.execute(
        f"INSERT INTO public.prompt_templates (feature, version, is_active, prompt_text) "
        f"VALUES ('interview_questions', 'v1.1', TRUE, '{escaped}')"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE public.question_sets DROP COLUMN IF EXISTS interview_stage")
    op.execute("ALTER TABLE public.question_sets DROP COLUMN IF EXISTS interview_stage_note")
    op.execute("ALTER TABLE public.question_sets DROP COLUMN IF EXISTS research_sources")

    op.execute("""
        DELETE FROM public.prompt_templates
         WHERE feature = 'interview_questions' AND version = 'v1.1'
    """)
    op.execute("""
        UPDATE public.prompt_templates
           SET is_active = TRUE
         WHERE feature = 'interview_questions' AND version = 'v1.0'
    """)
