import globals
import requests as http_requests
from jose import jwt

_jwks_cache = None


def _get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        url = f'https://{globals.AUTH0_DOMAIN}/.well-known/jwks.json'
        _jwks_cache = http_requests.get(url).json()
    return _jwks_cache


def validate_auth0_token(token):
    """Validate an Auth0 RS256 JWT. Returns decoded payload or None."""
    try:
        jwks = _get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        rsa_key = next(
            (k for k in jwks['keys'] if k.get('kid') == unverified_header.get('kid')),
            None
        )
        if not rsa_key:
            return None
        return jwt.decode(
            token,
            rsa_key,
            algorithms=['RS256'],
            issuer=f'https://{globals.AUTH0_DOMAIN}/',
            options={"verify_aud": False}
        )
    except Exception:
        return None
