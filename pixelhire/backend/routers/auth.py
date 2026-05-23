import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from supabase import Client, create_client

from database import get_db
from middleware.rate_limit import limiter
from models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

_anon_client: Client | None = None
_service_client: Client | None = None


def _get_anon_client() -> Client:
    global _anon_client
    if _anon_client is None:
        _anon_client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
        )
    return _anon_client


def _get_service_client() -> Client:
    global _service_client
    if _service_client is None:
        _service_client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
    return _service_client

ALGORITHM = "HS256"
VALID_ROLES = {"seeker", "recruiter"}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "seeker"


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def _create_token(subject: str, role: str, expires_delta: timedelta) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(
        {"sub": subject, "role": role, "exp": expire},
        os.environ["JWT_SECRET"],
        algorithm=ALGORITHM,
    )


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[ALGORITHM])
        sub: str | None = payload.get("sub")
        if sub is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user_id(token: Annotated[str, Depends(oauth2_scheme)]) -> str:
    return decode_token(token)["sub"]


async def get_current_user_payload(token: Annotated[str, Depends(oauth2_scheme)]) -> dict:
    return decode_token(token)


def _user_role(db: Session, user_id: str) -> str:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user.role


def _issue_token_pair(user_id: str, role: str) -> TokenResponse:
    access_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    refresh_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    return TokenResponse(
        access_token=_create_token(user_id, role, timedelta(minutes=access_minutes)),
        refresh_token=_create_token(user_id, role, timedelta(days=refresh_days)),
    )


@router.get("/stats")
async def signup_stats(db: Session = Depends(get_db)):
    from datetime import datetime, timezone
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    count = db.query(User).filter(User.created_at >= start_of_month).count()
    limit = 10_000
    return {
        "signups_this_month": count,
        "monthly_limit": limit,
        "spots_remaining": max(0, limit - count),
    }


@router.post("/register", status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"role must be one of {VALID_ROLES}")

    # Must use the publishable (anon) key here — sign_up via the service role key
    # auto-confirms the account and skips the verification email entirely.
    try:
        resp = _get_anon_client().auth.sign_up({
            "email": body.email,
            "password": body.password,
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not resp.user:
        raise HTTPException(status_code=400, detail="Registration failed")

    user_id = str(resp.user.id)
    if not db.query(User).filter(User.id == user_id).first():
        db.add(User(id=user_id, email=body.email, role=body.role))
        db.commit()
    return {"detail": "Verification email sent"}


@router.post("/token", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db),
):
    try:
        resp = _get_service_client().auth.sign_in_with_password({"email": form.username, "password": form.password})
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id = str(resp.user.id)
    return _issue_token_pair(user_id, _user_role(db, user_id))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: dict, db: Session = Depends(get_db)):
    token = body.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="refresh_token required")
    payload = decode_token(token)
    user_id = payload["sub"]
    return _issue_token_pair(user_id, _user_role(db, user_id))


@router.post("/change-password", status_code=200)
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    payload: Annotated[dict, Depends(get_current_user_payload)],
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        _get_service_client().auth.sign_in_with_password({"email": user.email, "password": body.current_password})
    except Exception:
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    try:
        _get_service_client().auth.admin.update_user_by_id(payload["sub"], {"password": body.new_password})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"detail": "Password updated"}
