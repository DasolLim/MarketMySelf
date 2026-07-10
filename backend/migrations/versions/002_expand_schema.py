"""Expand schema: new tables + pixel_sections columns + users role fix

Revision ID: 002
Revises: 001
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # users: fix role CHECK constraint (buyer→seeker, add recruiter)
    # ------------------------------------------------------------------
    op.execute("ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check")
    op.execute(
        "ALTER TABLE public.users ADD CONSTRAINT users_role_check "
        "CHECK (role IN ('seeker', 'recruiter', 'admin'))"
    )
    op.execute("UPDATE public.users SET role = 'seeker' WHERE role = 'buyer'")

    # ------------------------------------------------------------------
    # pixel_sections: add missing columns
    # ------------------------------------------------------------------
    op.add_column(
        "pixel_sections",
        sa.Column("experience_level", sa.Text(), nullable=True),
        schema="public",
    )
    op.add_column(
        "pixel_sections",
        sa.Column("tech_skills", postgresql.ARRAY(sa.Text()), nullable=True, server_default="{}"),
        schema="public",
    )
    op.add_column(
        "pixel_sections",
        sa.Column("soft_skills", postgresql.ARRAY(sa.Text()), nullable=True, server_default="{}"),
        schema="public",
    )
    op.add_column(
        "pixel_sections",
        sa.Column("resume_path", sa.Text(), nullable=True),
        schema="public",
    )
    op.add_column(
        "pixel_sections",
        sa.Column("resume_url", sa.Text(), nullable=True),
        schema="public",
    )
    op.add_column(
        "pixel_sections",
        sa.Column("links", postgresql.JSONB(), nullable=True),
        schema="public",
    )

    op.create_index(
        "idx_pixel_sections_job_category",
        "pixel_sections",
        ["job_category"],
        schema="public",
    )
    op.create_index(
        "idx_pixel_sections_experience",
        "pixel_sections",
        ["experience_level"],
        schema="public",
    )

    # ------------------------------------------------------------------
    # subscriptions
    # ------------------------------------------------------------------
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("public.users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stripe_subscription_id", sa.Text(), unique=True, nullable=False),
        sa.Column("tier", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("tier IN ('free', 'pro', 'enterprise')", name="subscriptions_tier_check"),
        sa.CheckConstraint("status IN ('active', 'cancelled', 'past_due')", name="subscriptions_status_check"),
        schema="public",
    )
    op.create_index("idx_subscriptions_user", "subscriptions", ["user_id"], schema="public")

    op.execute(
        "CREATE TRIGGER trg_subscriptions_updated_at "
        "BEFORE UPDATE ON public.subscriptions "
        "FOR EACH ROW EXECUTE FUNCTION update_updated_at()"
    )
    op.execute("ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY subscriptions_select_own ON public.subscriptions "
        "FOR SELECT USING (auth.uid() = user_id)"
    )

    # ------------------------------------------------------------------
    # job_posts
    # ------------------------------------------------------------------
    op.create_table(
        "job_posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("recruiter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("public.users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("job_category", sa.Text(), nullable=False),
        sa.Column("required_tech_skills", postgresql.ARRAY(sa.Text()), nullable=True, server_default="{}"),
        sa.Column("required_soft_skills", postgresql.ARRAY(sa.Text()), nullable=True, server_default="{}"),
        sa.Column("experience_level", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        schema="public",
    )
    op.create_index("idx_job_posts_recruiter", "job_posts", ["recruiter_id"], schema="public")
    op.create_index("idx_job_posts_active", "job_posts", ["is_active"], schema="public")

    op.execute(
        "CREATE TRIGGER trg_job_posts_updated_at "
        "BEFORE UPDATE ON public.job_posts "
        "FOR EACH ROW EXECUTE FUNCTION update_updated_at()"
    )
    op.execute("ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY job_posts_select_active ON public.job_posts "
        "FOR SELECT USING (is_active = TRUE OR recruiter_id = auth.uid())"
    )
    op.execute(
        "CREATE POLICY job_posts_modify_own ON public.job_posts "
        "FOR ALL USING (recruiter_id = auth.uid())"
    )

    # ------------------------------------------------------------------
    # applications
    # ------------------------------------------------------------------
    op.create_table(
        "applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("seeker_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("public.users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("public.job_posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="applied"),
        sa.Column("notification_sent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("seeker_id", "job_post_id", name="uq_application_seeker_job"),
        sa.CheckConstraint("status IN ('applied', 'viewed', 'shortlisted', 'rejected')", name="applications_status_check"),
        schema="public",
    )
    op.create_index("idx_applications_seeker", "applications", ["seeker_id"], schema="public")
    op.create_index("idx_applications_job_post", "applications", ["job_post_id"], schema="public")
    op.create_index("idx_applications_status", "applications", ["status"], schema="public")

    op.execute(
        "CREATE TRIGGER trg_applications_updated_at "
        "BEFORE UPDATE ON public.applications "
        "FOR EACH ROW EXECUTE FUNCTION update_updated_at()"
    )
    op.execute("ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY applications_seeker_own ON public.applications "
        "FOR SELECT USING (seeker_id = auth.uid())"
    )
    op.execute(
        "CREATE POLICY applications_recruiter_view ON public.applications "
        "FOR SELECT USING ("
        "  job_post_id IN (SELECT id FROM public.job_posts WHERE recruiter_id = auth.uid())"
        ")"
    )

    # ------------------------------------------------------------------
    # notifications
    # ------------------------------------------------------------------
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("public.users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        schema="public",
    )
    op.create_index("idx_notifications_user", "notifications", ["user_id"], schema="public")
    op.create_index("idx_notifications_unread", "notifications", ["user_id", "is_read"], schema="public")

    op.execute("ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY notifications_own ON public.notifications "
        "FOR ALL USING (user_id = auth.uid())"
    )

    # ------------------------------------------------------------------
    # coaching_sessions
    # ------------------------------------------------------------------
    op.create_table(
        "coaching_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("public.users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("input_text", sa.Text(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("questions", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        schema="public",
    )
    op.create_index("idx_coaching_sessions_user", "coaching_sessions", ["user_id"], schema="public")

    op.execute("ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY coaching_sessions_own ON public.coaching_sessions "
        "FOR ALL USING (user_id = auth.uid())"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.coaching_sessions CASCADE")
    op.execute("DROP TABLE IF EXISTS public.notifications CASCADE")
    op.execute("DROP TABLE IF EXISTS public.applications CASCADE")
    op.execute("DROP TABLE IF EXISTS public.job_posts CASCADE")
    op.execute("DROP TABLE IF EXISTS public.subscriptions CASCADE")

    op.drop_column("pixel_sections", "links", schema="public")
    op.drop_column("pixel_sections", "resume_url", schema="public")
    op.drop_column("pixel_sections", "resume_path", schema="public")
    op.drop_column("pixel_sections", "soft_skills", schema="public")
    op.drop_column("pixel_sections", "tech_skills", schema="public")
    op.drop_column("pixel_sections", "experience_level", schema="public")

    op.execute("ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check")
    op.execute(
        "ALTER TABLE public.users ADD CONSTRAINT users_role_check "
        "CHECK (role IN ('buyer', 'admin'))"
    )
