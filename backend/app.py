"""Flask application factory.

Run locally:   flask --app app run --debug
Production:    gunicorn "app:create_app()"   (see Procfile)
"""
import logging

from flask import Flask, jsonify

from config import Config
from extensions import cors, db, jwt
from utils.errors import register_error_handlers


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)
    if not app.config.get("TESTING"):
        config_object.validate()

    logging.basicConfig(level=app.config.get("LOG_LEVEL", "INFO"))

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, origins=app.config["CORS_ORIGINS"])  # explicit origins, never "*"

    # Importing models registers them with SQLAlchemy.
    from models import card, child, schedule, task, user  # noqa: F401

    from routes.auth import bp as auth_bp
    from routes.cards import bp as cards_bp
    from routes.speech import bp as speech_bp
    from routes.children import bp as children_bp
    from routes.progress import bp as progress_bp
    from routes.schedules import bp as schedules_bp
    from routes.tasks import bp as tasks_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(children_bp, url_prefix="/api/children")
    app.register_blueprint(schedules_bp, url_prefix="/api/schedules")
    app.register_blueprint(tasks_bp, url_prefix="/api/tasks")
    app.register_blueprint(cards_bp, url_prefix="/api/cards")
    app.register_blueprint(speech_bp, url_prefix="/api/speech")
    app.register_blueprint(progress_bp, url_prefix="/api")

    register_error_handlers(app, jwt)

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    return app


if __name__ == "__main__":
    create_app().run(debug=True)
