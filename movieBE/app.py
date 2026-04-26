from flask import Flask
from flask_cors import CORS

from blueprints.auth.auth import auth_bp
from blueprints.movies.movies import movies_bp
from blueprints.reviews.reviews import reviews_bp
from blueprints.users.users import users_bp
from blueprints.watchlist.watchlist import watchlist_bp

app = Flask(__name__)

CORS(app)

app.register_blueprint(auth_bp)
app.register_blueprint(movies_bp)
app.register_blueprint(reviews_bp)
app.register_blueprint(users_bp)
app.register_blueprint(watchlist_bp)

if __name__ == "__main__":
    app.run(debug=True, port=5001)
