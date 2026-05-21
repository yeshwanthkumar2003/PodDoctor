"""EKS discovery + dynamic kubeconfig generation."""
import base64
import tempfile
from typing import Optional

import boto3
from botocore.signers import RequestSigner

from services.aws import make_session
from utils.logger import get_logger

log = get_logger(__name__)

EKS_TOKEN_PREFIX = "k8s-aws-v1."
STS_TOKEN_EXPIRES_IN = 60  # seconds (token URL has presigned TTL; refresh often)


def list_clusters(access_key: str, secret_key: str, region: str) -> list[dict]:
    """Return discovered EKS clusters (basic info)."""
    session = make_session(access_key, secret_key, region)
    eks = session.client("eks")
    names = eks.list_clusters().get("clusters", [])
    out = []
    for name in names:
        info = eks.describe_cluster(name=name).get("cluster", {})
        out.append(
            {
                "name": info.get("name"),
                "arn": info.get("arn"),
                "endpoint": info.get("endpoint"),
                "version": info.get("version"),
                "status": info.get("status"),
                "region": region,
                "platformVersion": info.get("platformVersion"),
                "createdAt": info["createdAt"].isoformat() if info.get("createdAt") else None,
            }
        )
    return out


def describe_cluster(access_key: str, secret_key: str, region: str, name: str) -> dict:
    session = make_session(access_key, secret_key, region)
    eks = session.client("eks")
    return eks.describe_cluster(name=name).get("cluster", {})


def _get_bearer_token(session: boto3.session.Session, cluster_name: str) -> str:
    """Generate an EKS bearer token (same as `aws eks get-token`)."""
    client = session.client("sts")
    service_id = client.meta.service_model.service_id
    signer = RequestSigner(
        service_id, session.region_name, "sts", "v4", session.get_credentials(), session.events
    )
    params = {
        "method": "GET",
        "url": f"https://sts.{session.region_name}.amazonaws.com/"
               f"?Action=GetCallerIdentity&Version=2011-06-15",
        "body": {},
        "headers": {"x-k8s-aws-id": cluster_name},
        "context": {},
    }
    signed_url = signer.generate_presigned_url(
        params, region_name=session.region_name,
        expires_in=STS_TOKEN_EXPIRES_IN, operation_name=""
    )
    token = EKS_TOKEN_PREFIX + base64.urlsafe_b64encode(signed_url.encode()).rstrip(b"=").decode()
    return token


def build_kube_config(
    access_key: str, secret_key: str, region: str, cluster_name: str
) -> dict:
    """Return an in-memory kubeconfig dict + CA cert file path."""
    session = make_session(access_key, secret_key, region)
    info = session.client("eks").describe_cluster(name=cluster_name)["cluster"]
    endpoint = info["endpoint"]
    ca = info["certificateAuthority"]["data"]
    token = _get_bearer_token(session, cluster_name)

    # kubernetes python client wants a file path for the CA bundle
    ca_pem = base64.b64decode(ca)
    ca_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pem")
    ca_file.write(ca_pem)
    ca_file.flush()
    ca_file.close()

    return {
        "host": endpoint,
        "ssl_ca_cert": ca_file.name,
        "api_key": token,                       # used as Bearer
        "cluster_name": cluster_name,
        "region": region,
    }


def refresh_token(access_key: str, secret_key: str, region: str, cluster_name: str) -> str:
    session = make_session(access_key, secret_key, region)
    return _get_bearer_token(session, cluster_name)


def get_credentials_for_user(user) -> Optional[tuple[str, str, str]]:
    """Decrypt + return (access_key, secret_key, region) tuple from a User model."""
    from utils.security import decrypt
    if not user or not user.aws_access_key_enc:
        return None
    return (
        decrypt(user.aws_access_key_enc),
        decrypt(user.aws_secret_key_enc),
        user.aws_region,
    )
