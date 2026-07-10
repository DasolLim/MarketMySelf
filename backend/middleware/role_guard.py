import os
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def _decode_payload(token: str) -> dict:
    try:
        return jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_role(*allowed_roles: str):
    def dependency(token: Annotated[str, Depends(oauth2_scheme)]) -> dict:
        payload = _decode_payload(token)
        role = payload.get("role")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        if allowed_roles and role not in allowed_roles:
            raise HTTPException(status_code=403, detail=f"Role '{role}' not permitted here")
        return {"user_id": user_id, "role": role}
    return dependency
