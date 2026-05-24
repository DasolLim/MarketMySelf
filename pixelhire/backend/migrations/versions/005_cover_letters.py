"""Add cover_letters table and cover_letter prompt template

Revision ID: 005
Revises: 004
Create Date: 2026-05-23
"""
from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None

_COVER_LETTER_PROMPT = """\
You are an expert cover letter writer who has helped thousands of candidates land
interviews at top companies. You write cover letters that are specific, confident,
and directly aligned to the job description — never generic.

Write a professional cover letter for the following application. The letter must:

1. Open with a compelling hook in the first sentence — not "I am writing to apply."
   Reference something specific about {{company}} or the role that shows genuine
   interest.

2. In the body, draw direct connections between the candidate's experience and the
   specific requirements in the job description. Be concrete — name technologies,
   outcomes, and relevant achievements. If a resume is provided, pull from it
   directly. If not, write based on the job description and infer a credible profile.

3. Close with a confident call to action. One sentence. No "I look forward to
   hearing from you at your earliest convenience."

4. Match the writing style described below exactly. If no style is given, write in
   a confident, direct, professional tone — no fluff, no clichés.

5. Stay within {{max_characters}} characters total. This is a hard limit.
   Do not exceed it under any circumstance.

6. Do not include placeholder text like [Your Name] or [Date]. Write the body only —
   no header block, no salutation line, no sign-off. Those are added separately.

Rules:
- Never use: "I am writing to express my interest", "I am a passionate", "I am
  excited to", "leverage my skills", "I am a team player", "results-driven",
  "detail-oriented", "synergy", or any other resume cliché.
- Every claim must be grounded in the resume (if provided) or the JD context.
  Do not fabricate achievements or metrics.
- Write in first person.
- Use paragraph breaks naturally — typically 3–4 paragraphs total.

---
Inputs:

Job Position: {{job_position}}
Company: {{company}}
Job Description: {{job_description}}
Writing Style: {{writing_style}}
Max Characters: {{max_characters}}
Resume (structured, if provided): {{resume_json}}

---
Respond only with a valid JSON object. No markdown, no preamble, no explanation
outside the JSON.

{
  "cover_letter_text": "<the full cover letter body text>",
  "character_count": 0,
  "tone_used": "<1-2 word description of the tone applied e.g. confident and direct>",
  "key_connections": [
    "<specific connection drawn between candidate background and JD requirement>"
  ],
  "cliches_avoided": ["<list of clichés the prompt explicitly avoided>"]
}\
"""


def upgrade() -> None:
    # Widen the feature CHECK on prompt_templates to include cover_letter
    op.execute("""
        ALTER TABLE public.prompt_templates
            DROP CONSTRAINT IF EXISTS prompt_templates_feature_check
    """)
    op.execute("""
        ALTER TABLE public.prompt_templates
            ADD CONSTRAINT prompt_templates_feature_check
            CHECK (feature IN (
                'classifier', 'parser', 'diagnoser', 'recruiter',
                'rewriter', 'hiring_manager', 'cover_letter'
            ))
    """)

    # Seed the cover_letter prompt template
    escaped = _COVER_LETTER_PROMPT.replace("'", "''")
    op.execute(
        f"INSERT INTO public.prompt_templates (feature, version, is_active, prompt_text) "
        f"VALUES ('cover_letter', 'v1.0', TRUE, '{escaped}')"
    )

    # Create cover_letters table
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.cover_letters (
            id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id             UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            job_position        TEXT        NOT NULL,
            company             TEXT        NOT NULL,
            job_description     TEXT        NOT NULL,
            output_format       TEXT        NOT NULL CHECK (output_format IN ('pdf', 'text')),
            writing_style       TEXT,
            max_characters      INTEGER     NOT NULL DEFAULT 1500,
            resume_hash         TEXT,
            parsed_resume       JSONB,
            cover_letter_text   TEXT        NOT NULL,
            pdf_storage_path    TEXT,
            pdf_url             TEXT,
            prompt_version      TEXT        NOT NULL DEFAULT 'v1.0',
            model_used          TEXT        NOT NULL,
            raw_response        TEXT,
            parse_success       BOOLEAN     NOT NULL DEFAULT TRUE,
            tokens_input        INTEGER,
            tokens_output       INTEGER,
            latency_ms          INTEGER,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("CREATE INDEX IF NOT EXISTS idx_cover_letters_user ON public.cover_letters (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_cover_letters_user_created ON public.cover_letters (user_id, created_at DESC)")

    op.execute("ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "cover_letters_own_read"
            ON public.cover_letters FOR SELECT
            USING (auth.uid() = user_id)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.cover_letters CASCADE")
    op.execute(
        "DELETE FROM public.prompt_templates WHERE feature = 'cover_letter'"
    )
    op.execute("""
        ALTER TABLE public.prompt_templates
            DROP CONSTRAINT IF EXISTS prompt_templates_feature_check
    """)
    op.execute("""
        ALTER TABLE public.prompt_templates
            ADD CONSTRAINT prompt_templates_feature_check
            CHECK (feature IN (
                'classifier', 'parser', 'diagnoser', 'recruiter',
                'rewriter', 'hiring_manager'
            ))
    """)
