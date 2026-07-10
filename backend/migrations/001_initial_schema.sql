-- ============================================================
-- PixelHire — Initial Schema
-- Run against: Supabase (PostgreSQL 15+)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE job_category AS ENUM ('Technical', 'Marketing', 'Finance');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- ============================================================
-- USERS
-- Supabase Auth owns the primary auth.users table.
-- This profiles table extends it.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email        TEXT UNIQUE NOT NULL,
    role         TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'admin')),
    verified_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PIXEL SECTIONS
-- 3 pages × 60 cols × 50 rows = 9,000 total sections
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pixel_sections (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_number         SMALLINT NOT NULL CHECK (page_number BETWEEN 1 AND 3),
    row                 SMALLINT NOT NULL CHECK (row BETWEEN 1 AND 50),
    col                 SMALLINT NOT NULL CHECK (col BETWEEN 1 AND 60),

    -- Ownership
    owner_id            UUID REFERENCES public.users(id) ON DELETE SET NULL,
    purchased_at        TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    price_paid          NUMERIC(10, 2),

    -- Profile content
    full_name           TEXT,
    job_title           TEXT,
    bio                 VARCHAR(300),
    portfolio_url       TEXT,
    job_category        job_category,
    skills              TEXT[] DEFAULT '{}',

    -- Image
    image_path          TEXT,
    image_url           TEXT,
    image_size_bytes    INTEGER,
    image_uploaded_at   TIMESTAMPTZ,

    -- NFT (optional, future)
    nft_token_id        TEXT,
    nft_contract_addr   TEXT,

    -- Visibility
    is_published        BOOLEAN NOT NULL DEFAULT FALSE,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_section UNIQUE (page_number, row, col)
);

-- Index for fast grid fetches
CREATE INDEX idx_pixel_sections_page ON public.pixel_sections (page_number);
CREATE INDEX idx_pixel_sections_owner ON public.pixel_sections (owner_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_pixel_sections_updated_at
    BEFORE UPDATE ON public.pixel_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    pixel_section_id         UUID NOT NULL REFERENCES public.pixel_sections(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    amount                   NUMERIC(10, 2) NOT NULL,
    status                   payment_status NOT NULL DEFAULT 'pending',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON public.payments (user_id);
CREATE INDEX idx_payments_section ON public.payments (pixel_section_id);
CREATE INDEX idx_payments_stripe ON public.payments (stripe_payment_intent_id);

-- ============================================================
-- PIXEL VIEWS (analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pixel_views (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pixel_section_id  UUID NOT NULL REFERENCES public.pixel_sections(id) ON DELETE CASCADE,
    viewer_ip_hash    TEXT NOT NULL,
    viewed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pixel_views_section ON public.pixel_views (pixel_section_id);

-- ============================================================
-- SEED: pre-populate all 9,000 sections
-- ============================================================
INSERT INTO public.pixel_sections (page_number, row, col)
SELECT p.page, r.row, c.col
FROM   generate_series(1, 3) AS p(page),
       generate_series(1, 50) AS r(row),
       generate_series(1, 60) AS c(col)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixel_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixel_views ENABLE ROW LEVEL SECURITY;

-- USERS: read own row; admins read all
CREATE POLICY users_select_own ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_update_own ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- PIXEL_SECTIONS: everyone can read published sections and empty sections
CREATE POLICY sections_select_public ON public.pixel_sections
    FOR SELECT USING (
        is_published = TRUE
        OR owner_id IS NULL
        OR owner_id = auth.uid()
    );

-- Only owner can update their own section
CREATE POLICY sections_update_owner ON public.pixel_sections
    FOR UPDATE USING (auth.uid() = owner_id);

-- Backend service role handles inserts (purchase flow)
-- No direct client INSERT policy needed

-- PAYMENTS: users see only their own payments
CREATE POLICY payments_select_own ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

-- PIXEL_VIEWS: insert-only for authenticated + anon (rate-limited at API)
CREATE POLICY views_insert ON public.pixel_views
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY views_select_owner ON public.pixel_views
    FOR SELECT USING (
        pixel_section_id IN (
            SELECT id FROM public.pixel_sections WHERE owner_id = auth.uid()
        )
    );
