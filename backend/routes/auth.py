"""Auth — accepts AWS + Groq credentials, validates, stores encrypted."""
from flask import Blueprint, jsonify, request

from database.db import session_scope
from database.models import User
from services.aws import validate_credentials
from utils.helpers import serialize
from utils.security import encrypt, mask

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/aws/connect")
def connect_aws():
    """Validate AWS creds + store them encrypted. Body: {email, access_key, secret_key, region, groq_api_key}."""
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    access_key = (data.get("access_key") or "").strip()
    secret_key = (data.get("secret_key") or "").strip()
    region = (data.get("region") or "us-east-1").strip()
    groq_key = (data.get("groq_api_key") or "").strip()

    if not (email and access_key and secret_key):
        return jsonify(error="email, access_key, secret_key are required"), 400

    check = validate_credentials(access_key, secret_key, region)
    if not check.get("ok"):
        return jsonify(error="invalid AWS credentials", detail=check.get("error")), 401

    with session_scope() as s:
        user = s.query(User).filter_by(email=email).one_or_none()
        if not user:
            user = User(email=email)
            s.add(user)
        user.aws_access_key_enc = encrypt(access_key)
        user.aws_secret_key_enc = encrypt(secret_key)
        user.aws_region = region
        if groq_key:
            user.groq_api_key_enc = encrypt(groq_key)
        s.flush()
        payload = serialize(user)

    return jsonify(
        user={
            "id": payload["id"],
            "email": payload["email"],
            "aws_region": payload["aws_region"],
            "aws_access_key_masked": mask(access_key),
        },
        identity=check,
    )


@auth_bp.get("/me")
def me():
    email = (request.args.get("email") or "").strip().lower()
    if not email:
        return jsonify(error="email required"), 400
    with session_scope() as s:
        user = s.query(User).filter_by(email=email).one_or_none()
        if not user:
            return jsonify(error="not found"), 404
        return jsonify(
            id=user.id,
            email=user.email,
            aws_region=user.aws_region,
            connected=bool(user.aws_access_key_enc),
        )
