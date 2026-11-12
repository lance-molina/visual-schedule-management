-- Visual Schedule schema (MySQL 8 / MariaDB 10.x, utf8mb4).
-- Create the database first:  CREATE DATABASE visual_schedule CHARACTER SET utf8mb4;
-- Then:  mysql -u USER -p visual_schedule < database/schema.sql
-- NOTE: CHECK constraints are enforced from MySQL 8.0.16 (and MariaDB 10.2+). On older servers they are parsed but ignored,
-- so keep the same limits in utils/validators.py.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(255) NOT NULL,                 -- stored lowercase by the API
  password_hash  VARCHAR(255) NOT NULL,                 -- bcrypt; never the plain password
  role           ENUM('caregiver','occupational_therapist','sped_teacher') NOT NULL,
  font_size      ENUM('S','M','L') NOT NULL DEFAULT 'M',
  contrast       ENUM('normal','high') NOT NULL DEFAULT 'normal',
  sound_on       BOOLEAN NOT NULL DEFAULT TRUE,
  language       ENUM('en','fil') NOT NULL DEFAULT 'en',
  notify_daily   BOOLEAN NOT NULL DEFAULT FALSE,
  notify_task    BOOLEAN NOT NULL DEFAULT FALSE,
  notify_weekly  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS children (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  name          VARCHAR(100) NOT NULL,                  -- first name only (privacy)
  age           TINYINT UNSIGNED NOT NULL,
  delay_domain  VARCHAR(50) NOT NULL,
  notes         VARCHAR(500) NULL,
  photo_url     VARCHAR(255) NULL,                      -- preset avatar id or path; real uploads are P2
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_children_user (user_id),
  CONSTRAINT fk_children_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_children_age CHECK (age BETWEEN 1 AND 18)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS board_cards (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  label       VARCHAR(30) NOT NULL,                     -- the word that is spoken
  category    VARCHAR(30) NOT NULL,                     -- Food, Emotions, Activities or a name the adult chose
  icon        VARCHAR(40) NOT NULL,                     -- one preset Font Awesome class, e.g. fa-droplet (the API only accepts the preset list)
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_board_cards_user (user_id),
  CONSTRAINT fk_board_cards_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS schedules (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  child_id    INT UNSIGNED NOT NULL,
  date        DATE NOT NULL,                            -- decides which day progress counts
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schedules_child_date (child_id, date),  -- one schedule per child per date
  CONSTRAINT fk_schedules_child FOREIGN KEY (child_id) REFERENCES children (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tasks (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  schedule_id       INT UNSIGNED NOT NULL,
  name              VARCHAR(100) NOT NULL,
  icon              VARCHAR(50) NOT NULL,
  category          ENUM('hygiene','food','school','play') NOT NULL,
  time              TIME NOT NULL,
  duration          SMALLINT UNSIGNED NOT NULL,         -- minutes
  position          SMALLINT UNSIGNED NOT NULL,         -- decides display order
  reminder_minutes  TINYINT UNSIGNED NULL,
  status            ENUM('pending','completed') NOT NULL DEFAULT 'pending',
  completed_at      DATETIME NULL,                      -- UTC, set by the server
  PRIMARY KEY (id),
  KEY idx_tasks_schedule_position (schedule_id, position),
  CONSTRAINT fk_tasks_schedule FOREIGN KEY (schedule_id) REFERENCES schedules (id) ON DELETE CASCADE,
  CONSTRAINT ck_tasks_duration CHECK (duration BETWEEN 5 AND 240),
  CONSTRAINT ck_tasks_completed CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR (status = 'pending' AND completed_at IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
