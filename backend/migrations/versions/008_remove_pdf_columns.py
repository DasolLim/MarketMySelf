"""Remove pdf_storage_path and pdf_url from cover_letters

Revision ID: 008
Revises: 007
Create Date: 2026-05-23
"""
from alembic import op

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE public.cover_letters DROP COLUMN IF EXISTS pdf_storage_path")
    op.execute("ALTER TABLE public.cover_letters DROP COLUMN IF EXISTS pdf_url")


def downgrade() -> None:
    op.execute("ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT")
    op.execute("ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS pdf_url TEXT")
