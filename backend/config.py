"""Configuration read from environment variables (see .env.example).

Nothing secret is written here. In production the host's dashboard supplies the values.
"""
import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()  # reads backend/.env if present; harmless when it is not


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv("JWT_ACCESS_TOKEN_HOURS", "8")))
    JWT_REMEMBER_DAYS = int(os.getenv("JWT_REMEMBER_DAYS", "7"))

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # bcrypt work factor. 12 is a sound default; tests lower it so they run quickly.
    BCRYPT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", "12"))

    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    @classmethod
    def validate(cls):
        """Fail fast at start-up instead of failing mysteriously on the first request."""
        missing = [k for k in ("SECRET_KEY", "JWT_SECRET_KEY", "SQLALCHEMY_DATABASE_URI")
                   if not getattr(cls, k)]
        if missing:
            raise RuntimeError(f"Missing configuration: {', '.join(missing)}. See .env.example.")


class TestConfig(Config):
    """Used by pytest. An in-memory SQLite database by default.

    To run the same tests against MySQL, create an EMPTY test database (never the real one) and set
    TEST_DATABASE_URL, for example mysql+pymysql://user:password@127.0.0.1:3306/visual_schedule_test
    """
    TESTING = True
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt-secret-that-is-long-enough-for-hs256"
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL", "sqlite:///:memory:")
    BCRYPT_ROUNDS = 4
    CORS_ORIGINS = ["http://localhost:8000"]
