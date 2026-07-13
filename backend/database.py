import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

# On Vercel's serverless runtime each invocation may run in a fresh instance, so
# a persistent SQLAlchemy pool would exhaust Postgres connections. Use NullPool
# and point DATABASE_URL at Supabase's transaction pooler (pgBouncer, port 6543).
# Locally, keep a real pool for performance.
if os.getenv("VERCEL"):
    engine = create_engine(DATABASE_URL, poolclass=NullPool, pool_pre_ping=True)
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
