"""board_cards table. Mirrors database/schema.sql.

One row = one picture card the adult added to the talking board. The built-in starter cards live in the
frontend (js/board-cards.js), like the activity library, so a new account already has a usable board.
"""
from extensions import db
from utils.clock import iso_utc, utcnow

# The only pictures a card may use (preset Font Awesome icons, no uploads). Keep in sync with frontend/js/board-cards.js.
CARD_ICONS = ("fa-droplet", "fa-bowl-rice", "fa-glass-water", "fa-bread-slice", "fa-apple-whole", "fa-carrot", "fa-cookie-bite", "fa-egg", "fa-face-smile", "fa-face-sad-tear", "fa-face-angry", "fa-bed", "fa-face-surprise", "fa-puzzle-piece",
              "fa-futbol", "fa-tv", "fa-toilet", "fa-bath", "fa-music", "fa-house", "fa-book", "fa-palette", "fa-bus", "fa-shirt", "fa-shoe-prints", "fa-hand", "fa-hand-holding-heart")


class BoardCard(db.Model):
    __tablename__ = "board_cards"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    label = db.Column(db.String(30), nullable=False)       # the word that is spoken
    category = db.Column(db.String(30), nullable=False)    # Food, Emotions, Activities or a name the adult chose
    icon = db.Column(db.String(40), nullable=False)        # one of CARD_ICONS
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    user = db.relationship("User", back_populates="cards")

    def to_dict(self):
        return {"id": self.id, "label": self.label, "category": self.category,
                "icon": self.icon, "created_at": iso_utc(self.created_at)}
