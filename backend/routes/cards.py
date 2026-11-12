"""Talking-board card routes. Every query filters by the signed-in user_id.

GET    /api/cards        list own cards (page, per_page; default 100)
POST   /api/cards        create (user_id comes from the token; at most 100 cards, 30 with photos, per user)
PUT    /api/cards/<id>   replace label, category, icon, label_fil and image
DELETE /api/cards/<id>   delete -> 204
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models.card import BoardCard
from utils.errors import ApiError
from utils.ownership import current_user_id, get_card_or_404
from utils.pagination import paginate
from utils.validators import LIMITS, json_body, validate_card

bp = Blueprint("cards", __name__)


def _photo_count(user_id):
    return BoardCard.query.filter(BoardCard.user_id == user_id, BoardCard.image.isnot(None)).count()


@bp.get("")
@jwt_required()
def list_cards():
    query = (BoardCard.query.filter_by(user_id=current_user_id())
             .order_by(BoardCard.category, BoardCard.label, BoardCard.id))
    return jsonify(paginate(query, lambda card: card.to_dict(), default_per_page=100))


@bp.post("")
@jwt_required()
def create_card():
    data = validate_card(json_body())
    user_id = current_user_id()
    if BoardCard.query.filter_by(user_id=user_id).count() >= LIMITS["cards_per_user_max"]:
        raise ApiError(409, "conflict", f"You can keep at most {LIMITS['cards_per_user_max']} cards")
    if data["image"] and _photo_count(user_id) >= LIMITS["card_photos_per_user_max"]:
        raise ApiError(409, "conflict", f"You can keep at most {LIMITS['card_photos_per_user_max']} photo cards")
    card = BoardCard(user_id=user_id, label=data["label"], category=data["category"], icon=data["icon"],
                     label_fil=data.get("label_fil"), image=data["image"])
    db.session.add(card)
    db.session.commit()
    return jsonify(card.to_dict()), 201


@bp.put("/<int:card_id>")
@jwt_required()
def update_card(card_id):
    card = get_card_or_404(card_id, current_user_id())
    data = validate_card(json_body())
    if data["image"] and not card.image and _photo_count(card.user_id) >= LIMITS["card_photos_per_user_max"]:
        raise ApiError(409, "conflict", f"You can keep at most {LIMITS['card_photos_per_user_max']} photo cards")
    card.label, card.category, card.icon = data["label"], data["category"], data["icon"]
    card.label_fil, card.image = data.get("label_fil"), data["image"]     # a PUT replaces them (missing = cleared)
    db.session.commit()
    return jsonify(card.to_dict())


@bp.delete("/<int:card_id>")
@jwt_required()
def delete_card(card_id):
    card = get_card_or_404(card_id, current_user_id())
    db.session.delete(card)
    db.session.commit()
    return "", 204
