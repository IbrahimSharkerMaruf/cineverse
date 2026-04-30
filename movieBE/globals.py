import os
from pymongo import MongoClient

SECRET_KEY = 'mysecret'

AUTH0_DOMAIN = 'ibrahimsharker.uk.auth0.com'
AUTH0_AUDIENCE = 'http://127.0.0.1:5001'
ADMIN_EMAILS = {'collectionofmeme@gmail.com'}

POSTERS_DIR = os.path.join(os.path.dirname(__file__), '..', 'movieReview', 'movieFE', 'public', 'assets', 'images', 'posters')

client = MongoClient("mongodb://localhost:27017/")
db = client.biz_DB
