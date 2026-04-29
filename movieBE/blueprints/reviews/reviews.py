from flask import Blueprint, make_response, jsonify, request
from bson import ObjectId
from decorators import jwt_required

import globals

reviews_bp = Blueprint("reviews_bp", __name__)

movies = globals.db.biz
users_coll = globals.db.users


def valid_oid(oid_str):
    try:
        return ObjectId(oid_str)
    except Exception:
        return None


@reviews_bp.route("/movies/<string:movie_id>/reviews", methods=['GET'])
def fetch_all_reviews(movie_id):
    oid = valid_oid(movie_id)
    if not oid:
        return make_response(jsonify({"error": "Invalid movie ID format"}), 400)

    movie = movies.find_one({"_id": oid}, {"reviews": 1, "_id": 0})
    if movie is None:
        return make_response(jsonify({"error": "Movie not found"}), 404)

    data_to_return = []
    for review in movie.get("reviews", []):
        review['_id'] = str(review['_id'])
        for reply in review.get("replies", []):
            reply['_id'] = str(reply['_id'])
        data_to_return.append(review)

    return make_response(jsonify(data_to_return), 200)


@reviews_bp.route('/movies/<string:movie_id>/reviews', methods=['POST'])
def reviewMovie(movie_id):
    oid = valid_oid(movie_id)
    if not oid:
        return make_response(jsonify({"error": "Invalid movie ID format"}), 400)

    data = request.form

    username = data.get("username", "").strip()
    comment = data.get("comment", "").strip()
    star_raw = data.get("star", "").strip()

    if not username:
        return make_response(jsonify({"error": "username is required"}), 400)
    if len(username) > 50:
        return make_response(jsonify({"error": "username must be 50 characters or fewer"}), 422)
    if not comment:
        return make_response(jsonify({"error": "comment is required"}), 400)
    if len(comment) > 1000:
        return make_response(jsonify({"error": "comment must be 1000 characters or fewer"}), 422)
    if not star_raw:
        return make_response(jsonify({"error": "star rating is required"}), 400)

    try:
        stars = int(star_raw)
        if stars < 1 or stars > 5:
            return make_response(jsonify({"error": "star rating must be between 1 and 5"}), 422)
    except ValueError:
        return make_response(jsonify({"error": "star rating must be a whole number"}), 422)

    movie = movies.find_one({"_id": oid})
    if not movie:
        return make_response(jsonify({"error": "Movie not found"}), 404)

    avatar = data.get("avatar", "profile.png")
    allowed_avatars = {"profile.png", "man.png", "woman.png", "boy.png", "cat.png", "panda.png", "rabbit.png", "hacker.png"}
    if avatar not in allowed_avatars:
        avatar = "profile.png"

    new_review_id = ObjectId()
    new_review = {
        "_id": new_review_id,
        "username": username,
        "comment": comment,
        "star": stars,
        "avatar": avatar
    }

    movies.update_one({"_id": oid}, {"$push": {"reviews": new_review}})

    return make_response(jsonify({
        "url": f"http://127.0.0.1:5001/movies/{movie_id}/reviews/{str(new_review_id)}"
    }), 201)


@reviews_bp.route('/movies/<string:movie_id>/reviews/<string:review_id>', methods=['PUT'])
@jwt_required
def updateReview(movie_id, review_id):
    movie_oid = valid_oid(movie_id)
    review_oid = valid_oid(review_id)
    if not movie_oid or not review_oid:
        return make_response(jsonify({"error": "Invalid ID format"}), 400)

    # Check ownership: must be admin or the review author
    movie_doc = movies.find_one(
        {"_id": movie_oid, "reviews._id": review_oid},
        {"reviews.$": 1}
    )
    if not movie_doc or not movie_doc.get("reviews"):
        return make_response(jsonify({"error": "Review not found"}), 404)

    review_owner = movie_doc["reviews"][0].get("username")
    if not request.admin and review_owner != request.user:
        return make_response(jsonify({"error": "Not authorized to edit this review"}), 403)

    data = request.form
    update_field = {}

    if data.get("comment"):
        comment = data.get("comment").strip()
        if len(comment) > 1000:
            return make_response(jsonify({"error": "comment must be 1000 characters or fewer"}), 422)
        update_field["reviews.$.comment"] = comment

    if data.get("star"):
        try:
            stars = int(data.get("star"))
            if stars < 1 or stars > 5:
                return make_response(jsonify({"error": "star rating must be between 1 and 5"}), 422)
            update_field["reviews.$.star"] = stars
        except ValueError:
            return make_response(jsonify({"error": "star rating must be a whole number"}), 422)

    if not update_field:
        return make_response(jsonify({"error": "No valid review fields provided"}), 400)

    result = movies.update_one(
        {"_id": movie_oid, "reviews._id": review_oid},
        {"$set": update_field}
    )

    if result.matched_count == 0:
        return make_response(jsonify({"error": "Movie or review not found"}), 404)
    return make_response(jsonify({"message": "Review updated"}), 200)


@reviews_bp.route('/movies/<string:movie_id>/reviews/<string:review_id>', methods=['DELETE'])
@jwt_required
def deleteReview(movie_id, review_id):
    movie_oid = valid_oid(movie_id)
    review_oid = valid_oid(review_id)
    if not movie_oid or not review_oid:
        return make_response(jsonify({"error": "Invalid ID format"}), 400)

    # Check ownership: must be admin or the review author
    movie_doc = movies.find_one(
        {"_id": movie_oid, "reviews._id": review_oid},
        {"reviews.$": 1}
    )
    if not movie_doc or not movie_doc.get("reviews"):
        return make_response(jsonify({"error": "Review not found"}), 404)

    review_owner = movie_doc["reviews"][0].get("username")
    is_mod = getattr(request, 'moderator', False)

    if not request.admin:
        if review_owner == request.user:
            pass  # own review — always allowed
        elif is_mod:
            owner_doc = users_coll.find_one({"username": review_owner}, {"admin": 1})
            if owner_doc and owner_doc.get("admin"):
                return make_response(jsonify({"error": "Moderators cannot delete admin reviews"}), 403)
        else:
            return make_response(jsonify({"error": "Not authorized to delete this review"}), 403)

    result = movies.update_one(
        {"_id": movie_oid},
        {"$pull": {"reviews": {"_id": review_oid}}}
    )

    if result.modified_count == 1:
        return make_response(jsonify({"message": "Review deleted"}), 200)
    return make_response(jsonify({"error": "Review not found"}), 404)


@reviews_bp.route('/movies/<string:movie_id>/reviews/<string:review_id>/replies', methods=['POST'])
@jwt_required
def addReply(movie_id, review_id):
    movie_oid = valid_oid(movie_id)
    review_oid = valid_oid(review_id)
    if not movie_oid or not review_oid:
        return make_response(jsonify({"error": "Invalid ID format"}), 400)

    comment = request.form.get("comment", "").strip()
    if not comment:
        return make_response(jsonify({"error": "comment is required"}), 400)
    if len(comment) > 500:
        return make_response(jsonify({"error": "Reply must be 500 characters or fewer"}), 422)

    avatar = request.form.get("avatar", "profile.png")
    allowed_avatars = {"profile.png", "man.png", "woman.png", "boy.png", "cat.png", "panda.png", "rabbit.png", "hacker.png"}
    if avatar not in allowed_avatars:
        avatar = "profile.png"

    reply_id = ObjectId()
    new_reply = {
        "_id": reply_id,
        "username": request.user,
        "comment": comment,
        "avatar": avatar
    }

    result = movies.update_one(
        {"_id": movie_oid, "reviews._id": review_oid},
        {"$push": {"reviews.$.replies": new_reply}}
    )

    if result.matched_count == 0:
        return make_response(jsonify({"error": "Review not found"}), 404)
    return make_response(jsonify({"message": "Reply added", "reply_id": str(reply_id)}), 201)


@reviews_bp.route('/movies/<string:movie_id>/reviews/<string:review_id>/replies/<string:reply_id>', methods=['DELETE'])
@jwt_required
def deleteReply(movie_id, review_id, reply_id):
    movie_oid = valid_oid(movie_id)
    review_oid = valid_oid(review_id)
    reply_oid = valid_oid(reply_id)
    if not movie_oid or not review_oid or not reply_oid:
        return make_response(jsonify({"error": "Invalid ID format"}), 400)

    movie_doc = movies.find_one(
        {"_id": movie_oid, "reviews._id": review_oid},
        {"reviews.$": 1}
    )
    if not movie_doc or not movie_doc.get("reviews"):
        return make_response(jsonify({"error": "Review not found"}), 404)

    review = movie_doc["reviews"][0]
    reply = next((r for r in review.get("replies", []) if r["_id"] == reply_oid), None)
    if not reply:
        return make_response(jsonify({"error": "Reply not found"}), 404)

    is_mod = getattr(request, 'moderator', False)
    if not request.admin and reply["username"] != request.user and not is_mod:
        return make_response(jsonify({"error": "Not authorized to delete this reply"}), 403)

    movies.update_one(
        {"_id": movie_oid, "reviews._id": review_oid},
        {"$pull": {"reviews.$.replies": {"_id": reply_oid}}}
    )
    return make_response(jsonify({"message": "Reply deleted"}), 200)
