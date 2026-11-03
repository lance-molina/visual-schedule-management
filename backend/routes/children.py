"""Children routes. Every query filters by the signed-in user_id.

GET    /api/children        list own children (page, per_page)
POST   /api/children        create (user_id comes from the token, never from the body)
GET    /api/children/<id>   one child (404 if missing or not yours)
PUT    /api/children/<id>   replace the editable fields (notes and photo_url become null when omitted)
DELETE /api/children/<id>   delete child, schedules and tasks (cascade) -> 204
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models.child import Child
from utils.ownership import current_user_id, get_child_or_404
from utils.pagination import paginate
from utils.validators import json_body, validate_child

bp = Blueprint("children", __name__)


@bp.get("")
@jwt_required()
def list_children():
    query = Child.query.filter_by(user_id=current_user_id()).order_by(Child.name, Child.id)
    return jsonify(paginate(query, lambda child: child.to_dict()))


@bp.post("")
@jwt_required()
def create_child():
    data = validate_child(json_body())
    child = Child(user_id=current_user_id(), name=data["name"], age=data["age"],
                  delay_domain=data["delay_domain"], notes=data.get("notes"), photo_url=data.get("photo_url"))
    db.session.add(child)
    db.session.commit()
    return jsonify(child.to_dict()), 201


@bp.get("/<int:child_id>")
@jwt_required()
def get_child(child_id):
    return jsonify(get_child_or_404(child_id, current_user_id()).to_dict())


@bp.put("/<int:child_id>")
@jwt_required()
def update_child(child_id):
    child = get_child_or_404(child_id, current_user_id())
    data = validate_child(json_body())
    child.name, child.age, child.delay_domain = data["name"], data["age"], data["delay_domain"]
    child.notes, child.photo_url = data.get("notes"), data.get("photo_url")
    db.session.commit()
    return jsonify(child.to_dict())


@bp.delete("/<int:child_id>")
@jwt_required()
def delete_child(child_id):
    child = get_child_or_404(child_id, current_user_id())
    db.session.delete(child)      # the ORM cascade removes schedules and tasks; so does the database
    db.session.commit()
    return "", 204
