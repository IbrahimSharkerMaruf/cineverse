from flask import Blueprint, request, make_response, jsonify
from bson import ObjectId
from decorators import jwt_required

import globals

watchlist_bp = Blueprint("watchlist_bp", __name__)

users = globals.db.users
movies_coll = globals.db.biz


@watchlist_bp.route('/watchlist', methods=['GET'])
@jwt_required
def get_watchlist_ids():
    username = request.user
    user = users.find_one({"username": username}, {"watchlist": 1, "_id": 0})
    if not user:
        return make_response(jsonify([]), 200)
    return make_response(jsonify(user.get("watchlist", [])), 200)


@watchlist_bp.route('/watchlist/movies', methods=['GET'])
@jwt_required
def get_watchlist_movies():
    username = request.user
    user = users.find_one({"username": username}, {"watchlist": 1, "_id": 0})
    if not user:
        return make_response(jsonify([]), 200)

    watchlist_ids = user.get("watchlist", [])
    if not watchlist_ids:
        return make_response(jsonify([]), 200)

    oids = []
    for wid in watchlist_ids:
        try:
            oids.append(ObjectId(wid))
        except Exception:
            pass

    movie_list = list(movies_coll.find(
        {"_id": {"$in": oids}},
        {"_id": 1, "title": 1, "poster": 1, "vote_average": 1, "release_date": 1, "genres": 1}
    ))
    for m in movie_list:
        m["_id"] = str(m["_id"])

    return make_response(jsonify(movie_list), 200)


@watchlist_bp.route('/watchlist/<string:movie_id>', methods=['POST'])
@jwt_required
def add_to_watchlist(movie_id):
    username = request.user
    try:
        movie_oid = ObjectId(movie_id)
    except Exception:
        return make_response(jsonify({"error": "Invalid movie ID"}), 400)

    if not movies_coll.find_one({"_id": movie_oid}):
        return make_response(jsonify({"error": "Movie not found"}), 404)

    users.update_one(
        {"username": username},
        {"$addToSet": {"watchlist": movie_id}}
    )
    return make_response(jsonify({"message": "Added to watchlist"}), 200)


@watchlist_bp.route('/watchlist/<string:movie_id>', methods=['DELETE'])
@jwt_required
def remove_from_watchlist(movie_id):
    username = request.user
    users.update_one(
        {"username": username},
        {"$pull": {"watchlist": movie_id}}
    )
    return make_response(jsonify({"message": "Removed from watchlist"}), 200)
