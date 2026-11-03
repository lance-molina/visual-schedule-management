"""Auth routes. Contract: docs/api.md

POST  /api/auth/register  create account (name, email, password, role)  -> 201 user | 400, 409
POST  /api/auth/login     email + password (+ remember)                 -> 200 access_token, expires_in, user | 400, 401
GET   /api/auth/me        current user and settings                     -> 200 user | 401
PATCH /api/auth/me        update profile and settings                   -> 200 user | 400, 401, 409

Rules: bcrypt hash, reject passwords over 72 bytes, lowercase the email, ONE generic login error
for an unknown email and a wrong password, never return password_hash.
"""
from datetime import timedelta

import bcrypt
from flask import Blueprint, current_app, jsonify
from flask_jwt_extended import create_access_token, jwt_required
from sqlalchemy.exc import IntegrityError

from extensions import db
from models.user import User
from utils.errors import ApiError
from utils.ownership import current_user
from utils.validators import json_body, validate_login, validate_profile, validate_register

bp = Blueprint("auth", __name__)

_dummy_hash = None


def hash_password(plain):
    rounds = current_app.config["BCRYPT_ROUNDS"]
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds)).decode("ascii")


def verify_password(plain, hashed):
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("ascii"))
    except ValueError:      # for example a password longer than 72 bytes
        return False


def _fake_hash():
    """A hash to compare against when the email is unknown, so both failures take the same time."""
    global _dummy_hash
    if _dummy_hash is None:
        _dummy_hash = hash_password("not-a-real-password")
    return _dummy_hash


def _email_taken():
    return ApiError(409, "conflict", "That email is already registered", {"email": "Already registered"})


@bp.post("/register")
def register():
    data = validate_register(json_body())
    if User.query.filter_by(email=data["email"]).first():
        raise _email_taken()
    user = User(name=data["name"], email=data["email"], role=data["role"],
                password_hash=hash_password(data["password"]))
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:          # two registrations with the same email at the same moment
        db.session.rollback()
        raise _email_taken()
    return jsonify(user.to_dict()), 201


@bp.post("/login")
def login():
    data = validate_login(json_body())
    user = User.query.filter_by(email=data["email"]).first()
    password_ok = verify_password(data["password"], user.password_hash if user else _fake_hash())
    if user is None or not password_ok:
        raise ApiError(401, "invalid_credentials", "Email or password is incorrect")

    if data["remember"]:
        expires = timedelta(days=current_app.config["JWT_REMEMBER_DAYS"])
    else:
        expires = current_app.config["JWT_ACCESS_TOKEN_EXPIRES"]
    token = create_access_token(identity=str(user.id), expires_delta=expires)
    return jsonify(access_token=token, expires_in=int(expires.total_seconds()), user=user.to_dict())


@bp.get("/me")
@jwt_required()
def me():
    return jsonify(current_user().to_dict())


@bp.patch("/me")
@jwt_required()
def update_me():
    user = current_user()
    data = validate_profile(json_body())

    if "email" in data and data["email"] != user.email:
        if User.query.filter(User.email == data["email"], User.id != user.id).first():
            raise _email_taken()

    for key in ("name", "email", "role"):
        if key in data:
            setattr(user, key, data[key])
    for key, value in data.get("settings", {}).items():
        setattr(user, key, value)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise _email_taken()
    return jsonify(user.to_dict())
