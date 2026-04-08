"""
Database connection and session management
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from urllib.parse import urlparse, parse_qs

from app.core.config import settings


class Base(DeclarativeBase):
    """Base class for all database models"""
    pass


# Create async engine
DATABASE_URL = settings.DATABASE_URL

# Parse SSL mode from URL if present
connect_args = {}
if "sslmode" in DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    query_params = parse_qs(parsed.query)
    ssl_mode = query_params.get("sslmode", ["require"])[0]
    connect_args["ssl"] = ssl_mode
    # Remove sslmode from URL for asyncpg
    clean_url = parsed._replace(query="").geturl()
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = clean_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = clean_url.replace("postgres://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    connect_args=connect_args,
)

# Create async session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Close database connections"""
    await engine.dispose()
