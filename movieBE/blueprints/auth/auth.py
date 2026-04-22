from flask import Blueprint, request, make_response, jsonify
from decorators import jwt_required

import bcrypt
import jwt
import globals
import datetime

auth_bp = Blueprint("auth_bp", __name__)

blacklist = globals.db.blacklist
users = globals.db.users


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.form

    if not data.get("username") or not data.get("password"):
        return make_response(jsonify({"message":"missing username or password"}), 400)

    existing_user = users.find_one({"username": data.get("username")})

    if existing_user is not None:
        return make_response(jsonify({"message":"username already exists"}), 400)

    hashed_password = bcrypt.hashpw(bytes(data.get("password"), 'UTF-8'), bcrypt.gensalt())

    new_user = {
        "username": data.get("username"),
        "password": hashed_password,
        "admin": False
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
                    'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=30)
                }, globals.SECRET_KEY, algorithm='HS256')
                return make_response(jsonify({'token':token}),200)
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