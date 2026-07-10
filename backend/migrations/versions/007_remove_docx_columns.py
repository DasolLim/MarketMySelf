"""Remove docx columns from cover_letters

Revision ID: 007
Revises: 006
Create Date: 2026-05-23
"""
from alembic import op

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE public.cover_letters DROP COLUMN IF EXISTS docx_storage_path")
    op.execute("ALTER TABLE public.cover_letters DROP COLUMN IF EXISTS docx_url")


def downgrade() -> None:
    op.execute("ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS docx_storage_path TEXT")
    op.execute("ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS docx_url TEXT")
