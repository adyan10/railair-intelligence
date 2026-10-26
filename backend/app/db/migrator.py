"""RailAir Intelligence — Database Schema Migration Engine.

Discovers, sequences, and safely executes SQL schema migrations against
PostgreSQL + PostGIS. Ensures idempotent tracking via the `schema_migrations` table.
"""
import argparse
import logging
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
import psycopg

from .session import get_db_connection, normalize_db_url

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def ensure_migration_table(conn: psycopg.Connection) -> None:
    """Ensures the schema_migrations tracking table exists."""
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
    conn.commit()


def get_migration_files() -> List[Path]:
    """Returns sorted list of .sql migration files in the migrations directory."""
    if not MIGRATIONS_DIR.exists():
        return []
    return sorted(MIGRATIONS_DIR.glob("*.sql"), key=lambda p: p.name)


def get_applied_migrations(conn: psycopg.Connection) -> List[str]:
    """Returns list of already applied migration version filenames."""
    ensure_migration_table(conn)
    with conn.cursor() as cur:
        cur.execute("SELECT version FROM schema_migrations ORDER BY version;")
        rows = cur.fetchall()
        return [r[0] for r in rows]


def get_migration_status(conn: Optional[psycopg.Connection] = None) -> Dict[str, Any]:
    """Returns detailed status of applied and pending migrations."""
    def _check(active_conn: psycopg.Connection):
        applied = set(get_applied_migrations(active_conn))
        all_files = get_migration_files()
        
        status_items = []
        for f in all_files:
            is_applied = f.name in applied
            status_items.append({
                "version": f.name,
                "applied": is_applied,
                "file_path": str(f),
            })
        
        pending = [item["version"] for item in status_items if not item["applied"]]
        return {
            "total_migrations": len(all_files),
            "applied_count": len(applied),
            "pending_count": len(pending),
            "pending_versions": pending,
            "migrations": status_items,
        }

    if conn is not None:
        return _check(conn)
    with get_db_connection() as c:
        return _check(c)


def apply_migrations(conn: Optional[psycopg.Connection] = None) -> List[str]:
    """Applies all pending migrations in strict alphanumeric sequence."""
    def _apply(active_conn: psycopg.Connection) -> List[str]:
        ensure_migration_table(active_conn)
        applied_set = set(get_applied_migrations(active_conn))
        migration_files = get_migration_files()
        
        just_applied = []
        for mfile in migration_files:
            version = mfile.name
            if version in applied_set:
                logger.info("Migration %s already applied; skipping.", version)
                continue

            logger.info("Applying migration: %s ...", version)
            sql_content = mfile.read_text(encoding="utf-8")
            
            # Execute within transaction
            with active_conn.transaction():
                with active_conn.cursor() as cur:
                    cur.execute(sql_content)
                    cur.execute(
                        "INSERT INTO schema_migrations (version) VALUES (%s);",
                        (version,),
                    )
            just_applied.append(version)
            logger.info("Migration %s successfully applied.", version)

        return just_applied

    if conn is not None:
        return _apply(conn)
    with get_db_connection() as c:
        return _apply(c)


def reset_schema(conn: Optional[psycopg.Connection] = None, confirm: bool = False) -> None:
    """Safely resets the public schema for development testing.
    
    Requires confirm=True to prevent accidental data loss.
    """
    if not confirm:
        raise ValueError("reset_schema requires confirm=True to execute.")

    def _reset(active_conn: psycopg.Connection):
        logger.warning("Dropping and recreating public schema...")
        with active_conn.transaction():
            with active_conn.cursor() as cur:
                cur.execute("DROP SCHEMA IF EXISTS public CASCADE;")
                cur.execute("CREATE SCHEMA public;")
                cur.execute("GRANT ALL ON SCHEMA public TO postgres;")
                cur.execute("GRANT ALL ON SCHEMA public TO public;")
                cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        logger.info("Public schema reset completed.")

    if conn is not None:
        _reset(conn)
    else:
        with get_db_connection() as c:
            _reset(c)


def main():
    parser = argparse.ArgumentParser(description="RailAir Intelligence Database Migrator")
    parser.add_argument("--status", action="store_true", help="Print current migration status")
    parser.add_argument("--apply", action="store_true", help="Apply pending migrations")
    parser.add_argument("--reset", action="store_true", help="Reset public schema (CAUTION)")
    parser.add_argument("--confirm", action="store_true", help="Confirm destructive reset operation")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    if args.reset:
        if not args.confirm:
            print("ERROR: Schema reset requires --confirm flag.")
            sys.exit(1)
        print("Resetting database schema...")
        reset_schema(confirm=True)
        print("Reset complete. Reapplying migrations...")
        applied = apply_migrations()
        print(f"Applied migrations: {applied}")
        return

    if args.apply:
        print("Applying migrations...")
        applied = apply_migrations()
        if applied:
            print(f"Successfully applied {len(applied)} migration(s): {applied}")
        else:
            print("Database is already up to date. No pending migrations.")
        return

    # Default to status
    status = get_migration_status()
    print("=" * 60)
    print(" RailAir Intelligence — Migration Status")
    print("=" * 60)
    print(f" Total Migrations : {status['total_migrations']}")
    print(f" Applied          : {status['applied_count']}")
    print(f" Pending          : {status['pending_count']}")
    print("-" * 60)
    for m in status["migrations"]:
        state = "[APPLIED]" if m["applied"] else "[PENDING]"
        print(f" {state} {m['version']}")
    print("=" * 60)


if __name__ == "__main__":
    main()
