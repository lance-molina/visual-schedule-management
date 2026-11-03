"""One error shape everywhere: {"error": {"code", "message", "fields"?}}.

Every token problem (missing, malformed, expired, revoked) is mapped to 401.
"""
from flask import jsonify
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    def __init__(self, status, code, message, fields=None):
        super().__init__(message)
        self.status, self.code, self.message, self.fields = status, code, message, fields


def error_response(status, code, message, fields=None):
    body = {"error": {"code": code, "message": message}}
    if fields:
        body["error"]["fields"] = fields
    return jsonify(body), status


def not_found():
    """Same answer for 'does not exist' and 'not yours' so IDs cannot be probed."""
    return ApiError(404, "not_found", "Not found")


def register_error_handlers(app, jwt):
    @app.errorhandler(ApiError)
    def handle_api_error(e):
        return error_response(e.status, e.code, e.message, e.fields)

    @app.errorhandler(HTTPException)
    def handle_http_error(e):
        # 404, 405, 415 and friends keep the same JSON shape as everything else.
        code = (e.name or "error").lower().replace(" ", "_")
        return error_response(e.code or 500, code, e.name or "Error")

    @app.errorhandler(Exception)
    def handle_unexpected(_e):
        app.logger.exception("Unhandled error")  # details go to the log, never to the client
        return error_response(500, "server_error", "Something went wrong")

    # Every token problem becomes 401 with a generic message (no hints about why).
    @jwt.unauthorized_loader
    def _missing_token(_reason):
        return error_response(401, "unauthorized", "Authentication required")

    @jwt.invalid_token_loader
    def _invalid_token(_reason):
        return error_response(401, "unauthorized", "Authentication required")

    @jwt.expired_token_loader
    def _expired_token(_header, _payload):
        return error_response(401, "unauthorized", "Session expired")

    @jwt.revoked_token_loader
    def _revoked_token(_header, _payload):
        return error_response(401, "unauthorized", "Authentication required")

    @jwt.needs_fresh_token_loader
    def _needs_fresh(_header, _payload):
        return error_response(401, "unauthorized", "Authentication required")
