import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

from middleware.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

ALGORITHM = "HS256"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


def _create_token(subject: str, expires_delta: timedelta) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    return jwt.encode({"sub": subject, "exp": expire}, os.environ["JWT_SECRET"], algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[ALGORITHM])
        sub: str | None = payload.get("sub")
        if sub is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return sub
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user_id(token: Annotated[str, Depends(oauth2_scheme)]) -> str:
    return decode_token(token)


@router.post("/register", status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest):
    from supabase import create_client
    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    try:
        client.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": False,
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"detail": "Verification email sent"}


@router.post("/token", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, form: Annotated[OAuth2PasswordRequestForm, Depends()]):
    from supabase import create_client
    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    try:
        resp = client.auth.sign_in_with_password({"email": form.username, "password": form.password})
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user_id = str(resp.user.id)
    access_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    refresh_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    return TokenResponse(
        access_token=_create_token(user_id, timedelta(minutes=access_minutes)),
        refresh_token=_create_token(user_id, timedelta(days=refresh_days)),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: dict):
    token = body.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="refresh_token required")
    user_id = decode_token(token)
    access_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    refresh_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    return TokenResponse(
        access_token=_create_token(user_id, timedelta(minutes=access_minutes)),
        refresh_token=_create_token(user_id, timedelta(days=refresh_days)),
    )
