-- v2b: talking-board cards get an optional photo and an optional Filipino word.
-- Run ONCE on a database that already has the v2 board_cards table (it has no data worth keeping yet, so the
-- simplest alternative is: DROP TABLE board_cards;  then run schema.sql again).
-- Running it twice fails with "Duplicate column name"; that is harmless, nothing is changed.
-- Local SQLite demo (run-local.bat): delete local.db instead; run-local.bat creates a fresh one.

ALTER TABLE board_cards
  MODIFY icon VARCHAR(40) NOT NULL,
  ADD COLUMN label_fil VARCHAR(30) NULL AFTER label,
  ADD COLUMN image MEDIUMTEXT NULL AFTER icon;
