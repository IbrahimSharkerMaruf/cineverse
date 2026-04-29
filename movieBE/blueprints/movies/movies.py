from flask import Blueprint, request, make_response, jsonify
from bson import ObjectId, json_util
import json
import datetime
from decorators import jwt_required, admin_required

import globals

movies = globals.db.biz

movies_bp = Blueprint("movies_bp", __name__)

VALID_SORT_FIELDS = {
    "title", "vote_average", "popularity", "revenue",
    "runtime", "release_date", "vote_count", "budget"
}


@movies_bp.route('/', methods=['GET'])
@jwt_required
def showMovies():
    return jsonify({"message": "Welcome to Movie API"})


# ─── GET ALL (with multi-field filtering, sorting, pagination) ───────────────

@movies_bp.route('/movies', methods=['GET'])
def getAllMovies():
    data_to_return = []

    # ── Pagination with bounds check ──────────────────────────────────────────
    page_num = request.args.get('pn', default=1, type=int)
    page_size = request.args.get('ps', default=10, type=int)

    if page_num < 1:
        return make_response(jsonify({"error": "Page number must be 1 or greater"}), 400)
    if page_size < 1 or page_size > 50:
        return make_response(jsonify({"error": "Page size must be between 1 and 50"}), 400)

    page_start = (page_num - 1) * page_size
    query = {}

    # ── Text filters ──────────────────────────────────────────────────────────
    title = request.args.get('title')
    genre = request.args.get('genre')
    if title:
        words = [w.strip() for w in title.strip().split() if w.strip()]
        word_patterns = [{"title": {"$regex": w, "$options": "i"}} for w in words]
        query["$or"] = [{"title": {"$regex": title, "$options": "i"}}] + word_patterns
    if genre:
        query["genres"] = {"$regex": genre, "$options": "i"}

    # ── Rating range ──────────────────────────────────────────────────────────
    min_rating = request.args.get('min_rating', type=float)
    max_rating = request.args.get('max_rating', type=float)
    if min_rating is not None and not (0 <= min_rating <= 10):
        return make_response(jsonify({"error": "min_rating must be between 0 and 10"}), 400)
    if max_rating is not None and not (0 <= max_rating <= 10):
        return make_response(jsonify({"error": "max_rating must be between 0 and 10"}), 400)
    if min_rating is not None or max_rating is not None:
        query["vote_average"] = {}
        if min_rating is not None:
            query["vote_average"]["$gte"] = min_rating
        if max_rating is not None:
            query["vote_average"]["$lte"] = max_rating

    # ── Runtime range ─────────────────────────────────────────────────────────
    min_runtime = request.args.get('min_runtime', type=float)
    max_runtime = request.args.get('max_runtime', type=float)
    if min_runtime is not None or max_runtime is not None:
        query["runtime"] = {}
        if min_runtime is not None:
            query["runtime"]["$gte"] = min_runtime
        if max_runtime is not None:
            query["runtime"]["$lte"] = max_runtime

    # ── Release year filtering ────────────────────────────────────────────────
    year = request.args.get('year', type=int)
    min_year = request.args.get('min_year', type=int)
    max_year = request.args.get('max_year', type=int)
    if year:
        query["release_date"] = {"$regex": f"^{year}"}
    elif min_year or max_year:
        date_cond = {}
        if min_year:
            date_cond["$gte"] = f"{min_year}-01-01"
        if max_year:
            date_cond["$lte"] = f"{max_year}-12-31"
        query["release_date"] = date_cond

    # ── Sort field validation ─────────────────────────────────────────────────
    sort_field = request.args.get('sort')
    sort_order = request.args.get('order', default='desc')
    if sort_field and sort_field not in VALID_SORT_FIELDS:
        return make_response(jsonify({
            "error": f"Invalid sort field. Valid options: {', '.join(sorted(VALID_SORT_FIELDS))}"
        }), 400)
    if sort_order not in ('asc', 'desc'):
        return make_response(jsonify({"error": "sort order must be 'asc' or 'desc'"}), 400)

    try:
        total = movies.count_documents(query)

        if title and not sort_field:
            pipeline = [
                {"$match": query},
                {"$addFields": {
                    "_score": {"$switch": {"branches": [
                        {"case": {"$eq": [{"$toLower": "$title"}, title.lower()]}, "then": 0},
                        {"case": {"$eq": [{"$indexOfCP": [{"$toLower": "$title"}, title.lower()]}, 0]}, "then": 1},
                        {"case": {"$gte": [{"$indexOfCP": [{"$toLower": "$title"}, title.lower()]}, 0]}, "then": 2},
                    ], "default": 3}}
                }},
                {"$sort": {"_score": 1, "title": 1}},
                {"$skip": page_start},
                {"$limit": page_size},
                {"$project": {"_score": 0}}
            ]
            movies_cursor = movies.aggregate(pipeline)
        else:
            movies_cursor = movies.find(query)
            if sort_field:
                direction = 1 if sort_order == 'asc' else -1
                movies_cursor = movies_cursor.sort(sort_field, direction)
            movies_cursor = movies_cursor.skip(page_start).limit(page_size)

        for movie in movies_cursor:
            movie['_id'] = str(movie['_id'])
            if "reviews" not in movie:
                movie["reviews"] = []
            for review in movie["reviews"]:
                review["_id"] = str(review["_id"])
                for reply in review.get("replies", []):
                    reply["_id"] = str(reply["_id"])
            data_to_return.append(movie)

        return make_response(json.loads(json_util.dumps({
            "movies": data_to_return,
            "total": total,
            "page": page_num,
            "page_size": page_size
        })), 200)

    except ConnectionError:
        return make_response(jsonify({"error": "Database connection failed"}), 500)
    except Exception as e:
        return make_response(jsonify({"error": "Internal server error", "details": str(e)}), 500)


# ─── GET ONE ─────────────────────────────────────────────────────────────────

@movies_bp.route('/movies/<string:movie_id>', methods=['GET'])
def getOneMovie(movie_id):
    try:
        oid = ObjectId(movie_id)
    except Exception:
        return make_response(jsonify({"error": "Invalid movie ID format"}), 400)

    movie = movies.find_one({"_id": oid})
    if movie is None:
        return make_response(jsonify({"error": "Movie not found"}), 404)

    movie["_id"] = str(movie["_id"])
    if "reviews" not in movie:
        movie["reviews"] = []
    for review in movie["reviews"]:
        review["_id"] = str(review["_id"])
        for reply in review.get("replies", []):
            reply["_id"] = str(reply["_id"])

    return make_response(jsonify(movie), 200)


# ─── CREATE ───────────────────────────────────────────────────────────────────

@movies_bp.route('/movies', methods=['POST'])
@admin_required
def addMovie():
    data = request.form

    if not data.get("title") or not data.get("release_date"):
        return make_response(jsonify({"error": "title and release_date are required"}), 400)

    try:
        datetime.datetime.strptime(data.get("release_date").strip(), "%Y-%m-%d")
    except ValueError:
        return make_response(jsonify({"error": "release_date must be a valid date in YYYY-MM-DD format"}), 422)

    # Type and range validation
    try:
        vote_average = float(data.get("vote_average", 0))
        if not (0 <= vote_average <= 10):
            return make_response(jsonify({"error": "vote_average must be between 0 and 10"}), 422)
    except (ValueError, TypeError):
        return make_response(jsonify({"error": "vote_average must be a number"}), 422)

    try:
        runtime = float(data.get("runtime", 0))
        if runtime < 0:
            return make_response(jsonify({"error": "runtime cannot be negative"}), 422)
    except (ValueError, TypeError):
        return make_response(jsonify({"error": "runtime must be a number"}), 422)

    try:
        vote_count = int(data.get("vote_count", 0))
        if vote_count < 0:
            return make_response(jsonify({"error": "vote_count cannot be negative"}), 422)
    except (ValueError, TypeError):
        return make_response(jsonify({"error": "vote_count must be an integer"}), 422)

    try:
        popularity = float(data.get("popularity", 0))
    except (ValueError, TypeError):
        return make_response(jsonify({"error": "popularity must be a number"}), 422)

    try:
        budget = int(data.get("budget", 0))
        revenue = int(data.get("revenue", 0))
    except (ValueError, TypeError):
        return make_response(jsonify({"error": "budget and revenue must be integers"}), 422)

    new_movie = {
        "title": data.get("title").strip(),
        "release_date": data.get("release_date").strip(),
        "runtime": runtime,
        "budget": budget,
        "revenue": revenue,
        "overview": data.get("overview", "").strip(),
        "vote_average": vote_average,
        "vote_count": vote_count,
        "popularity": popularity,
        "genres": data.get("genres", "").strip(),
        "keywords": data.get("keywords", "").strip(),
        "reviews": []
    }

    result = movies.insert_one(new_movie)
    return make_response(jsonify({"url": f"http://127.0.0.1:5001/movies/{str(result.inserted_id)}"}), 201)


# ─── UPDATE ───────────────────────────────────────────────────────────────────

@movies_bp.route('/movies/<string:movie_id>', methods=['PUT'])
@admin_required
def updateMovie(movie_id):
    try:
        oid = ObjectId(movie_id)
    except Exception:
        return make_response(jsonify({"error": "Invalid movie ID format"}), 400)

    data = request.form
    update_field = {}

    if data.get("title"):
        update_field["title"] = data.get("title").strip()
    if data.get("release_date"):
        update_field["release_date"] = data.get("release_date").strip()
    if data.get("overview"):
        update_field["overview"] = data.get("overview").strip()
    if data.get("genres"):
        update_field["genres"] = data.get("genres").strip()
    if data.get("keywords"):
        update_field["keywords"] = data.get("keywords").strip()

    if data.get("runtime"):
        try:
            runtime = float(data.get("runtime"))
            if runtime < 0:
                return make_response(jsonify({"error": "runtime cannot be negative"}), 422)
            update_field["runtime"] = runtime
        except (ValueError, TypeError):
            return make_response(jsonify({"error": "runtime must be a number"}), 422)

    if data.get("vote_average"):
        try:
            va = float(data.get("vote_average"))
            if not (0 <= va <= 10):
                return make_response(jsonify({"error": "vote_average must be between 0 and 10"}), 422)
            update_field["vote_average"] = va
        except (ValueError, TypeError):
            return make_response(jsonify({"error": "vote_average must be a number"}), 422)

    if data.get("vote_count"):
        try:
            vc = int(data.get("vote_count"))
            if vc < 0:
                return make_response(jsonify({"error": "vote_count cannot be negative"}), 422)
            update_field["vote_count"] = vc
        except (ValueError, TypeError):
            return make_response(jsonify({"error": "vote_count must be an integer"}), 422)

    if data.get("budget"):
        try:
            update_field["budget"] = int(data.get("budget"))
        except (ValueError, TypeError):
            return make_response(jsonify({"error": "budget must be an integer"}), 422)

    if data.get("revenue"):
        try:
            update_field["revenue"] = int(data.get("revenue"))
        except (ValueError, TypeError):
            return make_response(jsonify({"error": "revenue must be an integer"}), 422)

    if data.get("popularity"):
        try:
            update_field["popularity"] = float(data.get("popularity"))
        except (ValueError, TypeError):
            return make_response(jsonify({"error": "popularity must be a number"}), 422)

    if not update_field:
        return make_response(jsonify({"error": "No valid fields to update"}), 400)

    result = movies.update_one({"_id": oid}, {"$set": update_field})

    if result.matched_count == 0:
        return make_response(jsonify({"error": "Movie not found"}), 404)
    if result.modified_count == 1:
        return make_response(jsonify({"url": f"http://127.0.0.1:5001/movies/{movie_id}"}), 200)
    return make_response(jsonify({"message": "No changes made"}), 200)


# ─── DELETE ───────────────────────────────────────────────────────────────────

@movies_bp.route('/movies/<string:movie_id>', methods=['DELETE'])
@admin_required
def deleteMovie(movie_id):
    try:
        oid = ObjectId(movie_id)
    except Exception:
        return make_response(jsonify({"error": "Invalid movie ID format"}), 400)

    result = movies.delete_one({"_id": oid})
    if result.deleted_count == 1:
        return make_response(jsonify({"message": "Movie deleted"}), 200)
    return make_response(jsonify({"error": "Movie not found"}), 404)


# ─── AGGREGATION PIPELINES ────────────────────────────────────────────────────

@movies_bp.route('/movies/stats/ratings', methods=['GET'])
def movie_rating_stats():
    """Overall rating statistics across all movies."""
    pipeline = [
        {
            "$group": {
                "_id": None,
                "total_movies":    {"$sum": 1},
                "average_rating":  {"$avg": "$vote_average"},
                "highest_rating":  {"$max": "$vote_average"},
                "lowest_rating":   {"$min": "$vote_average"},
                "total_votes":     {"$sum": "$vote_count"},
                "avg_popularity":  {"$avg": "$popularity"},
                "avg_runtime_min": {"$avg": "$runtime"},
                "total_revenue":   {"$sum": "$revenue"}
            }
        }
    ]
    stats = list(movies.aggregate(pipeline))
    return make_response(json.loads(json_util.dumps(stats)), 200)


@movies_bp.route('/movies/stats/by-year', methods=['GET'])
def movie_stats_by_year():
    """Aggregation pipeline: movie count, avg rating, and total revenue grouped by release year."""
    pipeline = [
        {"$match": {"release_date": {"$exists": True, "$ne": ""}}},
        {
            "$group": {
                "_id":           {"$substr": ["$release_date", 0, 4]},
                "count":         {"$sum": 1},
                "avg_rating":    {"$avg": "$vote_average"},
                "avg_popularity":{"$avg": "$popularity"},
                "total_revenue": {"$sum": "$revenue"}
            }
        },
        {"$sort": {"_id": -1}},
        {"$limit": 30}
    ]
    stats = list(movies.aggregate(pipeline))
    return make_response(json.loads(json_util.dumps(stats)), 200)


@movies_bp.route('/movies/stats/top', methods=['GET'])
def movie_top_stats():
    """Top N movies ranked by a given metric (popularity, revenue, vote_average, etc.)."""
    metric = request.args.get('by', default='popularity')
    limit = request.args.get('n', default=10, type=int)

    if metric not in VALID_SORT_FIELDS:
        return make_response(jsonify({
            "error": f"Invalid metric. Valid options: {', '.join(sorted(VALID_SORT_FIELDS))}"
        }), 400)
    if limit < 1 or limit > 50:
        return make_response(jsonify({"error": "n must be between 1 and 50"}), 400)

    pipeline = [
        {"$match": {metric: {"$exists": True, "$gt": 0}}},
        {"$sort": {metric: -1}},
        {"$limit": limit},
        {"$project": {
            "title": 1, "release_date": 1,
            "vote_average": 1, "popularity": 1,
            "revenue": 1, "runtime": 1, "_id": 1
        }}
    ]
    top = list(movies.aggregate(pipeline))
    for m in top:
        m['_id'] = str(m['_id'])
    return make_response(json.loads(json_util.dumps(top)), 200)
