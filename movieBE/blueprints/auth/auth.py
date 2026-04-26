from flask import Blueprint, request, make_response, jsonify
from decorators import jwt_required

import bcrypt
import jwt
import globals
import datetime

auth_bp = Blueprint("auth_bp", __name__)

blacklist = globals.db.blacklist
users = globals.db.users
movies_coll = globals.db.biz


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.form

    if not data.get("username") or not data.get("password"):
        return make_response(jsonify({"message":"missing username or password"}), 400)

    existing_user = users.find_one({"username": data.get("username")})

    if existing_user is not None:
        return make_response(jsonify({"message":"username already exists"}), 400)

    hashed_password = bcrypt.hashpw(bytes(data.get("password"), 'UTF-8'), bcrypt.gensalt())

    avatar = data.get("avatar", "profile.png")
    allowed_avatars = {"profile.png", "man.png", "woman.png", "boy.png", "cat.png", "panda.png", "rabbit.png", "hacker.png"}
    if avatar not in allowed_avatars:
        avatar = "profile.png"

    new_user = {
        "username": data.get("username"),
        "password": hashed_password,
        "avatar": avatar,
        "admin": False,
        "moderator": False,
        "watchlist": []
    }

    if data.get("admin") == "true":
        new_user["admin"] = True

    result = users.insert_one(new_user)
    new_user_link = f"http://127.0.0.1:5001/users/{str(result.inserted_id)}"

    return make_response(jsonify({"url": new_user_link}), 201)


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():

    if request.method == 'GET':
        auth = request.authorization

        if auth:
            user = users.find_one({"username":auth.username})

            if user is not None:
                if bcrypt.checkpw(bytes(auth.password, 'UTF-8'), user['password']):
                    token = jwt.encode({
                        'user':auth.username,
                        'admin':user['admin'],
                        'moderator':user.get('moderator', False),
                        'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=30)
                    }, globals.SECRET_KEY, algorithm='HS256')
                    return make_response(jsonify({'token':token}),200)
                else:
                    return make_response(jsonify({'message':'invalid password'}),401)
            else:
                return make_response(jsonify({'message':'invalid username'}),401)

        return make_response(jsonify({'message':'authentication required'}),401)

    if request.method == 'POST':
        data = request.form

        if not data.get("username") or not data.get("password"):
            return make_response(jsonify({"message":"missing username or password"}), 400)

        user = users.find_one({"username": data.get("username")})

        if user is not None:
            if bcrypt.checkpw(bytes(data.get("password"), 'UTF-8'), user['password']):
                token = jwt.encode({
                    'user':data.get("username"),
                    'admin':user['admin'],
                    'moderator':user.get('moderator', False),
                    'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=30)
                }, globals.SECRET_KEY, algorithm='HS256')
                return make_response(jsonify({
                    'token': token,
                    'username': user['username'],
                    'avatar': user.get('avatar', 'profile.png')
                }), 200)
            else:
                return make_response(jsonify({'message':'invalid password'}),401)
        else:
            return make_response(jsonify({'message':'invalid username'}),401)


@auth_bp.route('/logout', methods=['GET'])
@jwt_required
def logout():
    token = request.headers['x-access-token']
    blacklist.insert_one({"token":token})
    return make_response(jsonify({"message":"logout successful"}), 200)


@auth_bp.route('/profile', methods=['GET'])
@jwt_required
def get_profile():
    username = request.user
    user = users.find_one({"username": username}, {"password": 0})
    if not user:
        return make_response(jsonify({"error": "User not found"}), 404)
    user["_id"] = str(user["_id"])
    user["watchlist"] = user.get("watchlist", [])
    return make_response(jsonify(user), 200)


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required
def update_profile():
    username = request.user
    data = request.form

    user = users.find_one({"username": username})
    if not user:
        return make_response(jsonify({"error": "User not found"}), 404)

    current_password = data.get("current_password", "").strip()
    if not current_password:
        return make_response(jsonify({"error": "Current password is required"}), 400)
    if not bcrypt.checkpw(bytes(current_password, 'UTF-8'), user['password']):
        return make_response(jsonify({"error": "Current password is incorrect"}), 401)

    update_fields = {}
    new_username = data.get("new_username", "").strip()
    new_password = data.get("new_password", "").strip()

    if new_username and new_username != username:
        if len(new_username) < 3:
            return make_response(jsonify({"error": "Username must be at least 3 characters"}), 422)
        if users.find_one({"username": new_username}):
            return make_response(jsonify({"error": "Username already taken"}), 400)
        update_fields["username"] = new_username

    if new_password:
        if len(new_password) < 6:
            return make_response(jsonify({"error": "Password must be at least 6 characters"}), 422)
        update_fields["password"] = bcrypt.hashpw(bytes(new_password, 'UTF-8'), bcrypt.gensalt())

    if not update_fields:
        return make_response(jsonify({"error": "No changes provided"}), 400)

    users.update_one({"username": username}, {"$set": update_fields})

    if "username" in update_fields:
        movies_coll.update_many(
            {"reviews.username": username},
            {"$set": {"reviews.$[elem].username": new_username}},
            array_filters=[{"elem.username": username}]
        )
        username = new_username

    updated_user = users.find_one({"username": username})
    token = jwt.encode({
        'user': username,
        'admin': updated_user['admin'],
        'moderator': updated_user.get('moderator', False),
        'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=30)
    }, globals.SECRET_KEY, algorithm='HS256')

    return make_response(jsonify({
        "message": "Profile updated",
        "token": token,
        "username": username,
        "avatar": updated_user.get('avatar', 'profile.png')
    }), 200)


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


@auth_bp.route('/my-reviews', methods=['GET'])
@jwt_required
def get_my_reviews():
    username = request.user
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
