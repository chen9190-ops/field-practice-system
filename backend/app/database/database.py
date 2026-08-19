import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


# 项目根目录：field-practice-system/.env
ENV_PATH = Path(__file__).resolve().parents[3] / ".env"

load_dotenv(ENV_PATH)


# 平台或环境注入的值可能带首尾引号/空白，直接传给 create_engine 会解析失败
DATABASE_URL = os.getenv("DATABASE_URL", "").strip().strip('"').strip("'")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL 未配置")


engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()