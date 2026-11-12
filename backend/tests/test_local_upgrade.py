"""An old SQLite file (made before photo and Filipino-word columns existed) is upgraded in place instead of failing with 500."""
import sqlalchemy as sa

import models.card  # noqa: F401  (registers the table on the metadata)
from database.local_upgrade import add_missing_columns

OLD_TABLE = """CREATE TABLE board_cards (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, label VARCHAR(30) NOT NULL,
    category VARCHAR(30) NOT NULL, icon VARCHAR(40) NOT NULL, created_at DATETIME NOT NULL)"""


def columns(engine):
    return {c["name"] for c in sa.inspect(engine).get_columns("board_cards")}


def test_old_table_gets_the_new_columns_and_keeps_its_rows():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text(OLD_TABLE))
        conn.execute(sa.text("INSERT INTO board_cards (user_id, label, category, icon, created_at) "
                             "VALUES (1, 'Water', 'Food', 'fa-droplet', '2026-11-12 10:00:00')"))
    assert "image" not in columns(engine)
    added = add_missing_columns(engine)
    assert set(added) == {"board_cards.label_fil", "board_cards.image"}
    assert {"label_fil", "image"} <= columns(engine)
    with engine.connect() as conn:
        assert conn.execute(sa.text("SELECT label, image FROM board_cards")).one() == ("Water", None)


def test_second_run_changes_nothing():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text(OLD_TABLE))
    add_missing_columns(engine)
    assert add_missing_columns(engine) == []


def test_tables_that_do_not_exist_yet_are_left_to_create_all():
    assert add_missing_columns(sa.create_engine("sqlite://")) == []
