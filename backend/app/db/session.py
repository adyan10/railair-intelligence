"""Database connectivity and session management.

Provides non-blocking database status checking, connection pooling, and graceful
fallback to standalone simulation mode when PostgreSQL + PostGIS is unreachable.
"""
import logging
from contextlib import contextmanager
from typing import Dict, Any, Optional, Generator
import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from ..config import settings

logger = logging.getLogger(__name__)

_pool: Optional[ConnectionPool] = None


def normalize_db_url(url: Optional[str] = None) -> str:
    """Normalizes database URL for psycopg3 compatibility."""
    raw = url or settings.DATABASE_URL or ""
    if raw.startswith("postgresql+psycopg://"):
        return raw.replace("postgresql+psycopg://", "postgresql://", 1)
    if raw.startswith("postgres://"):
        return raw.replace("postgres://", "postgresql://", 1)
    return raw


def get_db_pool() -> Optional[ConnectionPool]:
    """Returns the singleton connection pool, initializing lazily if configured."""
    global _pool
    db_url = normalize_db_url()
    if not db_url:
        return None

    if _pool is None or _pool.closed:
        try:
            _pool = ConnectionPool(
                conninfo=db_url,
                min_size=1,
                max_size=getattr(settings, "DB_POOL_SIZE", 5),
                timeout=3.0,
                open=True,
            )
        except Exception as exc:
            logger.warning("Could not initialize database connection pool: %s", exc)
            return None
    return _pool


def close_db_pool() -> None:
    """Closes the database connection pool during application shutdown."""
    global _pool
    if _pool is not None and not _pool.closed:
        try:
            _pool.close()
        except Exception as exc:
            logger.warning("Error while closing database pool: %s", exc)
        finally:
            _pool = None


@contextmanager
def get_db_connection(row_factory=None) -> Generator[psycopg.Connection, None, None]:
    """Yields a database connection with auto-commit or auto-rollback on error.
    
    Raises RuntimeError if database is not configured or reachable.
    """
    db_url = normalize_db_url()
    if not db_url:
        raise RuntimeError("DATABASE_URL is not configured.")

    pool = get_db_pool()
    if pool is not None:
        with pool.connection(timeout=3.0) as conn:
            if row_factory:
                conn.row_factory = row_factory
            yield conn
    else:
        # Fallback to direct connection if pool failed to initialize
        with psycopg.connect(db_url, connect_timeout=3, row_factory=row_factory) as conn:
            yield conn


def check_db_connectivity() -> Dict[str, Any]:
    """Inspects database configuration and tests availability without raising errors."""
    db_url = normalize_db_url()
    if not db_url:
        return {
            "connected": False,
            "mode": "standalone_synthetic",
            "detail": "DATABASE_URL not configured. Running in in-memory simulation mode.",
        }

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                pg_row = cur.fetchone()
                pg_version_raw = pg_row[0] if pg_row else "Unknown"
                pg_version = pg_version_raw.split()[1] if pg_version_raw != "Unknown" else "16"

                postgis_version = "Not enabled"
                try:
                    cur.execute("SELECT PostGIS_Version();")
                    gis_row = cur.fetchone()
                    if gis_row:
                        postgis_version = gis_row[0]
                except Exception:
                    conn.rollback()

                return {
                    "connected": True,
                    "mode": "postgres",
                    "detail": (
                        f"Connected to PostgreSQL {pg_version} with PostGIS {postgis_version} "
                        f"on {conn.info.host or 'localhost'}:{conn.info.port or 5432}/{conn.info.dbname}."
                    ),
                }
    except Exception as exc:
        logger.debug("Database connectivity check failed: %s", exc)
        return {
            "connected": False,
            "mode": "standalone_synthetic",
            "detail": f"Database unavailable: {str(exc)}. Falling back to in-memory mode.",
        }
