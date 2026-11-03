"""The seed script must create only fictional data and be safe to run twice."""
from database.seed import DEMO, DEMO_PASSWORD, seed
from models.child import Child
from models.schedule import Schedule
from models.task import Task
from models.user import User
from tests.helpers import login


def test_seed_creates_demo_accounts_children_and_history(app, client):
    assert seed(app) is True
    assert User.query.count() == 3 and Child.query.count() == 5
    assert Schedule.query.count() == 5 * 15                    # 14 past days plus today
    assert Task.query.filter_by(status="completed").count() > 0
    assert Task.query.filter_by(status="completed").filter(Task.completed_at.is_(None)).count() == 0
    # The demo password works through the real login route.
    assert login(client, email=DEMO[0][0], password=DEMO_PASSWORD).status_code == 200


def test_seed_is_idempotent_and_reset_rebuilds(app):
    seed(app)
    assert seed(app) is False and User.query.count() == 3
    assert seed(app, reset=True) is True
    assert User.query.count() == 3 and Child.query.count() == 5


def test_seed_uses_example_addresses_only(app):
    seed(app)
    assert all(u.email.endswith("@example.com") for u in User.query.all())
