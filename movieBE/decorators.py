import globals
from flask import jsonify, request, make_response
import jwt
from functools import wraps

blacklist = globals.db.blacklist

def jwt_required(func):
    @wraps(func)
    def jwt_required_wrapper(*args, **kwargs):
        token = None

        if 'x-access-token' in request.headers:
            token = request.headers['x-access-token']

        if not token:
            return make_response(jsonify({"message":"token is missing"}), 401)

        try:
            data = jwt.decode(token, globals.SECRET_KEY, algorithms=['HS256'])
            request.user = data['user']
            request.admin = data['admin']
        except:
            return make_response(jsonify({"message":"invalid token"}), 401)

        bl_token = blacklist.find_one({'token':token})
        if bl_token is not None:
            return make_response(jsonify({"message":"Token has been cancelled"}), 401)

        return func(*args, **kwargs)
    return jwt_required_wrapper


def admin_required(func):
    @wraps(func)
    def admin_required_wrapper(*args, **kwargs):
        token = None

        if 'x-access-token' in request.headers:
            token = request.headers['x-access-token']

        if not token:
            return make_response(jsonify({"message":"token is missing"}), 401)

        try:
            data = jwt.decode(token, globals.SECRET_KEY, algorithms=['HS256'])
        except:
            return make_response(jsonify({"message":"invalid token"}), 401)

        bl_token = blacklist.find_one({'token':token})
        if bl_token is not None:
            return make_response(jsonify({"message":"Token has been cancelled"}), 401)

        if data['admin'] != True:
            return make_response(jsonify({"message":"admin access required"}), 403)

        return func(*args, **kwargs)
    return admin_required_wrapper