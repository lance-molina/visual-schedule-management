"""SQLite only: add columns that a newer version of the app expects to tables that already exist.

`db.create_all()` creates missing TABLES but never changes an existing one, so an old `local.db` kept after an update
makes queries fail with "no such column" (the app answers 500). This adds the missing columns so the demo database
keeps working without being deleted. It only adds nullable columns or columns with a default, and never touches data.
MySQL is not handled here: run the SQL files in database/migrations instead.
"""
from sqlalchemy import inspect, text

from extensions import db


def add_missing_columns(engine):
    """Returns a list like ["board_cards.label_fil", ...] of the columns that were added."""
    if engine.dialect.name != "sqlite":
        return []
    added = []
    inspector = inspect(engine)
    for table in db.metadata.sorted_tables:
        if not inspector.has_table(table.name):
            continue
        existing = {c["name"] for c in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in existing:
                continue
            if not column.nullable and column.default is None and column.server_default is None:
                print(f"  Cannot add {table.name}.{column.name} automatically (NOT NULL, no default); delete local.db instead.")
                continue
            ddl = column.type.compile(engine.dialect)
            with engine.begin() as conn:
                conn.execute(text(f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {ddl}'))
            added.append(f"{table.name}.{column.name}")
    return added
