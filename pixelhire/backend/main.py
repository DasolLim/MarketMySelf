import os
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from middleware.rate_limit import limiter, rate_limit_exceeded_handler
from routers import auth, sections, images, payments

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


@asynccontextmanager
async def lifespan(app: FastAPI):
    from database import engine
    try:
        with engine.connect():
            logger.info("Database connection OK")
    except Exception as e:
        logger.warning(f"Database connection failed: {e}")
    yield
    engine.dispose()


app = FastAPI(
    title="PixelHire API",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "stripe-signature"],
)

app.include_router(auth.router)
app.include_router(sections.router)
app.include_router(images.router)
app.include_router(payments.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
