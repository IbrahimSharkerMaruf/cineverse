import globals
from flask import jsonify, request, make_response
from functools import wraps
from auth0_utils import validate_auth0_token

users = globals.db.users


def _get_token():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    return request.headers.get('x-access-token')


def jwt_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        token = _get_token()
        if not token:
            return make_response(jsonify({"message": "token is missing"}), 401)

        payload = validate_auth0_token(token)
        if not payload:
            return make_response(jsonify({"message": "invalid token"}), 401)

        sub = payload.get('sub')
        user = users.find_one({"sub": sub})
        if not user:
            return make_response(jsonify({"message": "user not synced"}), 401)

        request.user = user['username']
        request.admin = user.get('admin', False)
        request.moderator = user.get('moderator', False)

        return func(*args, **kwargs)
    return wrapper


def admin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        token = _get_token()
        if not token:
            return make_response(jsonify({"message": "token is missing"}), 401)

        payload = validate_auth0_token(token)
        if not payload:
            return make_response(jsonify({"message": "invalid token"}), 401)

        sub = payload.get('sub')
        user = users.find_one({"sub": sub})
        if not user:
            return make_response(jsonify({"message": "user not synced"}), 401)

        if not user.get('admin', False):
            return make_response(jsonify({"message": "admin access required"}), 403)

        request.user = user['username']
        request.admin = True
        request.moderator = user.get('moderator', False)

        return func(*args, **kwargs)
    return wrapper
