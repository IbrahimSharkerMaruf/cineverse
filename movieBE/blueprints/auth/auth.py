from flask import Blueprint, request, make_response, jsonify
from decorators import jwt_required
from auth0_utils import validate_auth0_token

import globals

auth_bp = Blueprint("auth_bp", __name__)

users = globals.db.users
movies_coll = globals.db.biz


# ── Auth0 sync ─────────────────────────────────────────────────────────────────
# Called by the frontend after every Auth0 login to create/find the user in
# MongoDB and return the CineVerse profile (username, avatar, admin, watchlist).

@auth_bp.route('/auth/sync', methods=['POST'])
def auth_sync():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return make_response(jsonify({"error": "No token provided"}), 401)

    token = auth_header[7:]
    payload = validate_auth0_token(token)
    if not payload:
        return make_response(jsonify({"error": "Invalid token"}), 401)

    sub      = payload.get('sub')
    email    = payload.get('email', '')
    nickname = payload.get('nickname') or payload.get('name', '') or sub

    existing = users.find_one({"sub": sub})

    if existing is None:
        # Ensure the derived username is unique
        username = nickname
        if users.find_one({"username": username}):
            username = f"{nickname}_{sub[-6:]}"

        new_user = {
            "sub": sub,
            "username": username,
            "email": email,
            "avatar": "profile.png",
            "admin": email in globals.ADMIN_EMAILS,
            "moderator": False,
            "watchlist": []
        }
        users.insert_one(new_user)
        user = new_user
    else:
        user = existing

    return make_response(jsonify({
        "username":  user['username'],
        "email":     user.get('email', ''),
        "avatar":    user.get('avatar', 'profile.png'),
        "admin":     user.get('admin', False),
        "moderator": user.get('moderator', False),
        "watchlist": user.get('watchlist', [])
    }), 200)


# ── Profile ────────────────────────────────────────────────────────────────────

@auth_bp.route('/profile', methods=['GET'])
@jwt_required
def get_profile():
    username = request.user
    user = users.find_one({"username": username}, {"password": 0, "sub": 0})
    if not user:
        return make_response(jsonify({"error": "User not found"}), 404)
    user["_id"] = str(user["_id"])
    user["watchlist"] = user.get("watchlist", [])
    return make_response(jsonify(user), 200)


# ── Account deletion ───────────────────────────────────────────────────────────

@auth_bp.route('/delete-account', methods=['DELETE'])
@jwt_required
def delete_own_account():
    username = request.user
    movies_coll.update_many(
        {"reviews.username": username},
        {"$pull": {"reviews": {"username": username}}}
    )
    users.delete_one({"username": username})
    return make_response(jsonify({"message": "Account deleted"}), 200)


# ── My Reviews / Replies ───────────────────────────────────────────────────────

@auth_bp.route('/my-reviews', methods=['GET'])
@jwt_required
def get_my_reviews():
    username = request.user
    pipeline = [
        {"$unwind": "$reviews"},
        {"$match": {"reviews.username": username}},
        {"$project": {
            "_id": 0,
            "movie_id":    {"$toString": "$_id"},
            "movie_title": "$title",
            "poster":      "$poster",
            "review_id":   {"$toString": "$reviews._id"},
            "comment":     "$reviews.comment",
            "star":        "$reviews.star"
        }}
    ]
    return make_response(jsonify(list(movies_coll.aggregate(pipeline))), 200)


@auth_bp.route('/my-replies', methods=['GET'])
@jwt_required
def get_my_replies():
    username = request.user
    pipeline = [
        {"$unwind": "$reviews"},
        {"$unwind": "$reviews.replies"},
        {"$match": {"reviews.replies.username": username}},
        {"$project": {
            "_id": 0,
            "movie_id":       {"$toString": "$_id"},
            "movie_title":    "$title",
            "poster":         "$poster",
            "review_id":      {"$toString": "$reviews._id"},
            "review_username": "$reviews.username",
            "review_comment": "$reviews.comment",
            "reply_id":       {"$toString": "$reviews.replies._id"},
            "comment":        "$reviews.replies.comment"
        }}
    ]
    return make_response(jsonify(list(movies_coll.aggregate(pipeline))), 200)
