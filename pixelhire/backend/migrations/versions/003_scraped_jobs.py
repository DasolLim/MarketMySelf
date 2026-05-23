"""Add scraped_jobs table for seeker-facing live job board

Revision ID: 003
Revises: 002
Create Date: 2026-05-13
"""
from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.scraped_jobs (
            id                TEXT        PRIMARY KEY,
            source            TEXT        NOT NULL,
            source_id         TEXT,
            source_url        TEXT        NOT NULL,
            title             TEXT        NOT NULL,
            company           TEXT        NOT NULL,
            company_id        TEXT,
            location_city     TEXT,
            location_country  TEXT        NOT NULL DEFAULT 'US',
            remote_raw        TEXT,
            work_type         TEXT,
            employment_type   TEXT,
            experience_level  TEXT,
            category          TEXT,
            description       TEXT,
            description_text  TEXT,
            skills            TEXT[],
            salary_min        INTEGER,
            salary_max        INTEGER,
            salary_raw        TEXT,
            posted_at         TIMESTAMPTZ,
            scraped_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
            expires_at        TIMESTAMPTZ NOT NULL,
            is_active         BOOLEAN     NOT NULL DEFAULT TRUE
        )
    """)

    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_scraped_jobs_dedup
            ON public.scraped_jobs (title, company, source)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_scraped_jobs_work_type
            ON public.scraped_jobs (work_type)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_scraped_jobs_experience
            ON public.scraped_jobs (experience_level)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_scraped_jobs_category
            ON public.scraped_jobs (category)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_scraped_jobs_location
            ON public.scraped_jobs (location_city)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_scraped_jobs_company_id
            ON public.scraped_jobs (company_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_scraped_jobs_posted_at
            ON public.scraped_jobs (posted_at DESC)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_scraped_jobs_skills
            ON public.scraped_jobs USING GIN (skills)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_scraped_jobs_fts
            ON public.scraped_jobs USING GIN (
                to_tsvector('english',
                    coalesce(title, '') || ' ' || coalesce(description_text, ''))
            )
    """)

    op.execute("ALTER TABLE public.scraped_jobs ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "read_active_scraped_jobs"
            ON public.scraped_jobs FOR SELECT
            USING (is_active = TRUE AND expires_at > now())
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.scraped_jobs CASCADE")
