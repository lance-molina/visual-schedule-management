"""Shared pytest fixtures.

The tests run on in-memory SQLite so they are fast and need no setup. SQLite does not behave exactly
like MySQL (ENUM and CHECK handling differ), so before submission run the suite once against an empty
MySQL test database:  TEST_DATABASE_URL=mysql+pymysql://... pytest   (see config.TestConfig).
"""
import pytest

from app import create_app
from config import TestConfig
from extensions import db
from tests.helpers import make_user


@pytest.fixture()
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def user_a(client):
    return make_user(client, "adult.a@example.com", name="Adult A")


@pytest.fixture()
def user_b(client):
    return make_user(client, "adult.b@example.com", name="Adult B", role="sped_teacher")
