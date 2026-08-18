import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv


load_dotenv()


JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET 未配置")


security_scheme = HTTPBearer()


def create_access_token(
    user_id: int,
    role: str,
) -> str:
    """
    创建 JWT。

    payload:
    {
        "id": 3,
        "role": "student",
        "iat": ...,
        "exp": ...
    }
    """

    if role not in ("student", "teacher"):
        raise ValueError("role 必须是 student 或 teacher")

    now = datetime.now(timezone.utc)

    payload = {
        "id": user_id,
        "role": role,
        "iat": now,
        "exp": now + timedelta(
            hours=ACCESS_TOKEN_EXPIRE_HOURS
        ),
    }

    token = jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )

    return token


def decode_access_token(
    token: str,
) -> dict:
    """
    验证并解析 JWT。
    """

    credentials_exception = HTTPException(
        status_code=401,
        detail="登录状态无效或已过期",
        headers={
            "WWW-Authenticate": "Bearer"
        },
    )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
        )

        user_id = payload.get("id")
        role = payload.get("role")

        if user_id is None:
            raise credentials_exception

        if role not in (
            "student",
            "teacher",
        ):
            raise credentials_exception

        return payload

    except jwt.ExpiredSignatureError:
        raise credentials_exception

    except jwt.InvalidTokenError:
        raise credentials_exception


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security_scheme
    ),
):
    """
    从：

    Authorization: Bearer <token>

    中读取 JWT，并返回当前用户身份。
    """

    token = credentials.credentials

    payload = decode_access_token(
        token
    )

    return {
        "id": payload["id"],
        "role": payload["role"],
    }