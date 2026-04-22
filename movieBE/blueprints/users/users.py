from flask import Blueprint, request, make_response, jsonify
from bson import ObjectId
from decorators import jwt_required

import bcrypt
import globals

users_bp = Blueprint("users_bp", __name__)

users = globals.db.users


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