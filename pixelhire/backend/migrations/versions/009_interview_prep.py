"""Add interview prep tables and prompt templates

Revision ID: 009
Revises: 008
Create Date: 2026-05-23
"""
from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None

_INTERVIEW_QUESTIONS_PROMPT = """\
You are a senior technical recruiter and career coach with 15+ years of experience
conducting and preparing candidates for job interviews across all industries.

Generate a targeted set of behavioral and situational interview questions based on
the candidate's resume and the job they are applying for. Questions must be specific,
not generic — reference actual details from the resume and job description.

Structure your output as a JSON object. No markdown, no explanation outside the JSON.

Inputs:
Job Position: {{job_position}}
Company: {{company}}
Job Description: {{job_description}}
Resume (structured): {{resume_json}}

Generate exactly {{num_questions}} behavioral/situational interview questions.
Each question should:
- Target a specific skill or experience area relevant to this role
- Use the STAR/SHARE framework (Situation, Action, Result)
- Be phrased as an interviewer would ask it
- Vary in difficulty (mix of warm-up, core competency, and challenge questions)

{
  "questions": [
    {
      "id": 1,
      "question": "<the interview question>",
      "category": "<one of: behavioral, situational, competency, culture_fit>",
      "target_skill": "<the skill or competency being assessed>",
      "difficulty": "<one of: warm_up, core, challenge>",
      "hint": "<brief guidance on what a strong answer covers, 1 sentence>"
    }
  ],
  "role_summary": "<2-sentence summary of what this role demands from candidates>",
  "key_themes": ["<top 3-5 themes that will dominate this interview>"]
}\
"""

_CLOSING_QUESTIONS_PROMPT = """\
You are a senior career coach who helps candidates ask insightful questions at the
end of job interviews. Great closing questions demonstrate genuine interest, strategic
thinking, and cultural fit — they are never generic.

Generate smart questions the candidate should ask the interviewer, tailored to the
specific role and company.

Inputs:
Job Position: {{job_position}}
Company: {{company}}
Job Description: {{job_description}}

Generate exactly 8 questions the candidate should ask. Mix categories:
- Role clarity (2 questions): specifics about responsibilities and expectations
- Team and culture (2 questions): team dynamics, management style, collaboration
- Growth and impact (2 questions): career trajectory, success metrics, strategic direction
- Process and tooling (2 questions): workflows, tools, how decisions are made

{
  "questions": [
    {
      "question": "<the question to ask>",
      "category": "<one of: role_clarity, team_culture, growth_impact, process_tooling>",
      "why_ask": "<1 sentence: why this question impresses an interviewer>"
    }
  ]
}\
"""

_INTERVIEW_ANSWER_PROMPT = """\
You are an elite interview coach who specializes in helping candidates structure
compelling answers using the SHARE framework:

S — Situation: Set the scene (brief context, when/where/what)
H — Hindrance: The challenge, obstacle, or problem you faced
A — Action: Exactly what YOU did (not the team — use "I" not "we")
R — Result: Quantified outcome or concrete impact
E — Evaluation: What you learned or would do differently

Analyze the candidate's answer and provide structured feedback.

Inputs:
Interview Question: {{question}}
Candidate's Answer: {{candidate_answer}}
Job Position: {{job_position}}
Company: {{company}}

Evaluate the answer and produce a structured coaching response.

{
  "share_breakdown": {
    "situation": {"present": true, "quality": "<weak|adequate|strong>", "feedback": "<1-2 sentences>"},
    "hindrance": {"present": true, "quality": "<weak|adequate|strong>", "feedback": "<1-2 sentences>"},
    "action":    {"present": true, "quality": "<weak|adequate|strong>", "feedback": "<1-2 sentences>"},
    "result":    {"present": true, "quality": "<weak|adequate|strong>", "feedback": "<1-2 sentences>"},
    "evaluation":{"present": false,"quality": "<weak|adequate|strong>", "feedback": "<1-2 sentences>"}
  },
  "overall_score": 72,
  "score_rationale": "<2-3 sentences explaining the score>",
  "strongest_part": "<what the candidate did best in 1 sentence>",
  "critical_gap": "<the single most important thing missing or weak>",
  "improved_answer": "<a rewritten version of the answer that scores 90+, matching candidate's voice>",
  "one_line_tip": "<the single most actionable tip for next time, under 15 words>"
}\
"""


def upgrade() -> None:
    # Widen the feature CHECK to include interview prep features
    op.execute("""
        ALTER TABLE public.prompt_templates
            DROP CONSTRAINT IF EXISTS prompt_templates_feature_check
    """)
    op.execute("""
        ALTER TABLE public.prompt_templates
            ADD CONSTRAINT prompt_templates_feature_check
            CHECK (feature IN (
                'classifier', 'parser', 'diagnoser', 'recruiter',
                'rewriter', 'hiring_manager', 'cover_letter',
                'interview_questions', 'closing_questions', 'interview_answer'
            ))
    """)

    # Seed the three interview prep prompt templates
    for feature, version, prompt_text in [
        ("interview_questions", "v1.0", _INTERVIEW_QUESTIONS_PROMPT),
        ("closing_questions",   "v1.0", _CLOSING_QUESTIONS_PROMPT),
        ("interview_answer",    "v1.0", _INTERVIEW_ANSWER_PROMPT),
    ]:
        escaped = prompt_text.replace("'", "''")
        op.execute(
            f"INSERT INTO public.prompt_templates (feature, version, is_active, prompt_text) "
            f"VALUES ('{feature}', '{version}', TRUE, '{escaped}')"
        )

    # question_sets — one AI-generated question bank per job application
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.question_sets (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            job_position    TEXT        NOT NULL,
            company         TEXT        NOT NULL,
            job_description TEXT        NOT NULL,
            resume_hash     TEXT,
            questions       JSONB       NOT NULL DEFAULT '[]',
            closing_questions JSONB     NOT NULL DEFAULT '[]',
            role_summary    TEXT,
            key_themes      JSONB       NOT NULL DEFAULT '[]',
            num_questions   INTEGER     NOT NULL DEFAULT 10,
            model_used      TEXT        NOT NULL,
            prompt_version  TEXT        NOT NULL DEFAULT 'v1.0',
            tokens_input    INTEGER,
            tokens_output   INTEGER,
            latency_ms      INTEGER,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_question_sets_user ON public.question_sets (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_question_sets_user_created ON public.question_sets (user_id, created_at DESC)")
    op.execute("ALTER TABLE public.question_sets ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "question_sets_own_read"
            ON public.question_sets FOR SELECT
            USING (auth.uid() = user_id)
    """)

    # interview_answers — one row per question answered in a mock session
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.interview_answers (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            question_set_id UUID        REFERENCES public.question_sets(id) ON DELETE SET NULL,
            question_text   TEXT        NOT NULL,
            question_category TEXT,
            target_skill    TEXT,
            candidate_answer TEXT       NOT NULL,
            job_position    TEXT        NOT NULL,
            company         TEXT        NOT NULL,
            share_breakdown JSONB,
            overall_score   INTEGER,
            score_rationale TEXT,
            strongest_part  TEXT,
            critical_gap    TEXT,
            improved_answer TEXT,
            one_line_tip    TEXT,
            model_used      TEXT        NOT NULL,
            prompt_version  TEXT        NOT NULL DEFAULT 'v1.0',
            tokens_input    INTEGER,
            tokens_output   INTEGER,
            latency_ms      INTEGER,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_interview_answers_user ON public.interview_answers (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_interview_answers_user_created ON public.interview_answers (user_id, created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_interview_answers_question_set ON public.interview_answers (question_set_id)")
    op.execute("ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "interview_answers_own_read"
            ON public.interview_answers FOR SELECT
            USING (auth.uid() = user_id)
    """)

    # interview_sessions — lightweight header tracking a mock interview run
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.interview_sessions (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            question_set_id UUID        REFERENCES public.question_sets(id) ON DELETE SET NULL,
            job_position    TEXT        NOT NULL,
            company         TEXT        NOT NULL,
            questions_total INTEGER     NOT NULL DEFAULT 0,
            questions_answered INTEGER  NOT NULL DEFAULT 0,
            avg_score       NUMERIC(5,2),
            completed_at    TIMESTAMPTZ,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_interview_sessions_user ON public.interview_sessions (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_created ON public.interview_sessions (user_id, created_at DESC)")
    op.execute("ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "interview_sessions_own_read"
            ON public.interview_sessions FOR SELECT
            USING (auth.uid() = user_id)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.interview_sessions CASCADE")
    op.execute("DROP TABLE IF EXISTS public.interview_answers CASCADE")
    op.execute("DROP TABLE IF EXISTS public.question_sets CASCADE")

    op.execute(
        "DELETE FROM public.prompt_templates WHERE feature IN "
        "('interview_questions', 'closing_questions', 'interview_answer')"
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
                'rewriter', 'hiring_manager', 'cover_letter'
            ))
    """)
