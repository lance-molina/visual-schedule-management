"""Seed script: creates FICTIONAL demo data only. Run after the tables exist:

    python database/seed.py                    add the demo accounts (does nothing if they already exist)
    python database/seed.py --reset            delete the demo accounts and everything under them, then re-add
    python database/seed.py --create-tables    also create the tables from the models (for a throw-away SQLite
                                               file only; on MySQL run database/schema.sql instead). An existing
                                               SQLite file also gets any columns added by newer versions.

Demo accounts (all use the demo-only password printed below). NEVER run this against a database that real
people use, and change or delete these accounts on any deployed copy.

Dates are relative to today so the progress charts always have recent history.
"""
import argparse
import os
import random
import sys
from datetime import datetime, time, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt  # noqa: E402

from app import create_app  # noqa: E402
from database.local_upgrade import add_missing_columns  # noqa: E402
from extensions import db  # noqa: E402
from models.child import Child  # noqa: E402
from models.schedule import Schedule  # noqa: E402
from models.task import Task  # noqa: E402
from models.user import User  # noqa: E402

DEMO_PASSWORD = "DemoPass123"       # fictional accounts only

ROUTINE = [   # (name, icon, category, time, duration)
    ("Get dressed", "fa-shirt", "hygiene", "07:00", 10),
    ("Brush teeth", "fa-tooth", "hygiene", "07:15", 5),
    ("Eat breakfast", "fa-utensils", "food", "07:30", 20),
    ("Go to school", "fa-school", "school", "08:00", 30),
    ("Wash hands", "fa-hands-bubbles", "hygiene", "12:00", 5),
    ("Play time", "fa-puzzle-piece", "play", "16:00", 45),
]

# email, name, role, [(child name, age, delay_domain, notes, avatar, completion chance)]
DEMO = [
    ("caregiver.demo@example.com", "Demo Caregiver", "caregiver", [
        ("Mika", 6, "speech", "Likes trains", "train", 0.85),
        ("Ben", 8, "motor", "Needs reminders to wash hands", "dog", 0.6),
        ("Lia", 5, "social_emotional", None, "cat", 0.4),
    ]),
    ("therapist.demo@example.com", "Demo Therapist", "occupational_therapist", [
        ("Noel", 7, "adaptive", "Fictional demo child", "dragon", 0.7),
    ]),
    ("teacher.demo@example.com", "Demo Teacher", "sped_teacher", [
        ("Ana", 9, "cognitive", "Fictional demo child", "fish", 0.75),
    ]),
]


def hash_password(plain, rounds):
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds)).decode()


def add_schedule(child, day, rng, chance, today):
    """One day of the routine. Past days get random but repeatable completions; today stays untouched."""
    schedule = Schedule(child=child, date=day)
    for position, (name, icon, category, hhmm, duration) in enumerate(ROUTINE, start=1):
        hour, minute = map(int, hhmm.split(":"))
        task = Task(schedule=schedule, name=name, icon=icon, category=category, time=time(hour, minute),
                    duration=duration, position=position, reminder_minutes=5 if position == 1 else None)
        if day < today and rng.random() < chance:
            task.set_status("completed")
            task.completed_at = datetime(day.year, day.month, day.day, hour, minute) + timedelta(minutes=duration)
    # Add LAST: the tasks above reached the schedule through a backref, and SQLAlchemy 2 only saves them
    # when the schedule joins the session after they are attached.
    db.session.add(schedule)
    return schedule


def seed(app, reset=False, history_days=14):
    rounds = app.config["BCRYPT_ROUNDS"]
    emails = [row[0] for row in DEMO]
    existing = User.query.filter(User.email.in_(emails)).all()
    if existing and not reset:
        print("Demo accounts already exist. Use --reset to rebuild them.")
        return False
    for user in existing:
        db.session.delete(user)       # cascades to children, schedules and tasks
    db.session.commit()

    rng = random.Random(42)           # fixed seed: the same demo data every time
    today = datetime.now().date()
    for email, name, role, kids in DEMO:
        user = User(name=name, email=email, role=role, password_hash=hash_password(DEMO_PASSWORD, rounds))
        db.session.add(user)
        for kid_name, age, domain, notes, avatar, chance in kids:
            child = Child(user=user, name=kid_name, age=age, delay_domain=domain, notes=notes, photo_url=avatar)
            db.session.add(child)       # explicit: a backref alone does not put the child in the session
            for back in range(history_days, -1, -1):
                add_schedule(child, today - timedelta(days=back), rng, chance, today)
    db.session.commit()

    print("Seeded fictional demo data. Sign in with:")
    for email, _name, role, kids in DEMO:
        print(f"  {email:32} {DEMO_PASSWORD}   ({role}; children: {', '.join(k[0] for k in kids)})")
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reset", action="store_true", help="delete the demo accounts first")
    parser.add_argument("--create-tables", action="store_true", help="create tables from the models (SQLite dev only)")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        if args.create_tables:
            db.create_all()
            added = add_missing_columns(db.engine)      # an older local.db gets the new columns instead of failing
            if added:
                print("Upgraded the existing local database: added " + ", ".join(added))
        seed(app, reset=args.reset)


if __name__ == "__main__":
    main()
