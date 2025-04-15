from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from .config import settings

DATABASE_URL = settings.get_db_url()

# create async engine and session maker
engine = create_async_engine(url=DATABASE_URL)
session_maker = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    __abstract__ = True
