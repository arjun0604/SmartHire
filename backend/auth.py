import logging
import os
from typing import Optional
import jwt
from jwt import PyJWKClient
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Candidate, Recruiter, User

logger = logging.getLogger(__name__)

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN") or os.getenv("VITE_AUTH0_DOMAIN") or "arjun0604.us.auth0.com"
AUTH0_API_AUDIENCE = os.getenv("AUTH0_API_AUDIENCE") or os.getenv("VITE_AUTH0_AUDIENCE") or "https://api.smarthire.com"
AUTH0_ISSUER = os.getenv("AUTH0_ISSUER") or f"https://{AUTH0_DOMAIN}/"

jwks_client = PyJWKClient(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json", cache_keys=True)


def get_auth0_id_from_token(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split("Bearer ", 1)[1].strip()
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=AUTH0_API_AUDIENCE,
            issuer=AUTH0_ISSUER,
            options={"verify_exp": True},
        )
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token sub claim missing",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return sub
    except jwt.PyJWTError as e:
        logger.warning(f"JWT validation failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    sub = get_auth0_id_from_token(authorization)
    user = db.query(User).filter(User.auth0_id == sub).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user record not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_recruiter(
    user: User = Depends(get_current_user),
) -> Recruiter:
    if user.role != "recruiter" or not user.recruiter:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated recruiter credentials required",
        )
    return user.recruiter


def get_current_candidate(
    user: User = Depends(get_current_user),
) -> Candidate:
    if user.role != "candidate" or not user.candidate:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated candidate credentials required",
        )
    return user.candidate
