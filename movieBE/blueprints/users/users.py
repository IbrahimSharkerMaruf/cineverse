from flask import Blueprint, request, make_response, jsonify
from bson import ObjectId
from decorators import jwt_required, admin_required

import bcrypt
import globals

users_bp = Blueprint("users_bp", __name__)

users = globals.db.users
movies_coll = globals.db.biz


@users_bp.route('/users/<string:user_id>', methods=['GET'])
@jwt_required
def get_one_user(user_id):
    user = users.find_one({"_id": ObjectId(user_id)}, {"password": 0})

    if user is not None:
        user["_id"] = str(user["_id"])
        return make_response(jsonify(user), 200)
    else:
        return make_response(jsonify({"Error":"User not found"}), 404)


@users_bp.route('/users/<string:user_id>', methods=['PUT'])
@jwt_required
def update_user(user_id):
    data = request.form
    update_field = {}

    if data.get("username"):
        update_field["username"] = data.get("username")

    if data.get("password"):
        hashed_password = bcrypt.hashpw(bytes(data.get("password"), 'UTF-8'), bcrypt.gensalt())
        update_field["password"] = hashed_password

    if data.get("admin") == "true":
        update_field["admin"] = True
    if data.get("admin") == "false":
        update_field["admin"] = False

    if not update_field:
        return make_response(jsonify({"error":"No valid data passed"}),404)

    results = users.update_one(
        {"_id":ObjectId(user_id)},
        {"$set":update_field}
    )

    if results.modified_count == 1:
        updated_user_link = f"http://127.0.0.1:5001/users/{user_id}"
        return make_response(jsonify({"URL":updated_user_link}),200)
    else:
        return make_response(jsonify({"message":"No changes made"}),201)


@users_bp.route('/users/<string:user_id>', methods=['DELETE'])
@jwt_required
def delete_user(user_id):
    results = users.delete_one({"_id":ObjectId(user_id)})

    if results.deleted_count == 1:
        return make_response(jsonify({"Message":"User deleted"}), 200)
    else:
        return make_response(jsonify({"Error":"No user ID found"}), 404)


# ── Admin user management ────────────────────────────────────────────────────

@users_bp.route('/admin/users', methods=['GET'])
@admin_required
def list_all_users():
    all_users = list(users.find({}, {"password": 0}))
    review_count_pipeline = [
        {"$unwind": "$reviews"},
        {"$group": {"_id": "$reviews.username", "count": {"$sum": 1}}}
    ]
    review_counts = {doc["_id"]: doc["count"] for doc in movies_coll.aggregate(review_count_pipeline)}
    for u in all_users:
        u["_id"] = str(u["_id"])
        u["watchlist_count"] = len(u.get("watchlist", []))
        u["review_count"] = review_counts.get(u["username"], 0)
        u.pop("watchlist", None)
    return make_response(jsonify(all_users), 200)


@users_bp.route('/admin/users/<string:username>/reviews', methods=['GET'])
@admin_required
def get_user_reviews(username):
    pipeline = [
        {"$unwind": "$reviews"},
        {"$match": {"reviews.username": username}},
        {"$project": {
            "_id": 0,
            "movie_id": {"$toString": "$_id"},
            "movie_title": "$title",
            "poster": "$poster",
            "review_id": {"$toString": "$reviews._id"},
            "comment": "$reviews.comment",
            "star": "$reviews.star"
        }}
    ]
    results = list(movies_coll.aggregate(pipeline))
    return make_response(jsonify(results), 200)


@users_bp.route('/admin/users/<string:username>/moderator', methods=['PUT'])
@admin_required
def set_moderator(username):
    user = users.find_one({"username": username})
    if not user:
        return make_response(jsonify({"error": "User not found"}), 404)
    if user.get("admin"):
        return make_response(jsonify({"error": "Cannot change moderator status of an admin"}), 403)
    value = request.form.get("moderator", "true").lower() == "true"
    users.update_one({"username": username}, {"$set": {"moderator": value}})
    return make_response(jsonify({"moderator": value}), 200)


@users_bp.route('/admin/users/<string:username>', methods=['DELETE'])
@admin_required
def admin_delete_user(username):
    user = users.find_one({"username": username})
    if not user:
        return make_response(jsonify({"error": "User not found"}), 404)
    # remove all their embedded reviews from movies
    movies_coll.update_many(
        {"reviews.username": username},
        {"$pull": {"reviews": {"username": username}}}
    )
    users.delete_one({"username": username})
    return make_response(jsonify({"message": "User deleted"}), 200)