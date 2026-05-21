"""AWS helpers — credential validation + STS."""
import boto3
from botocore.exceptions import BotoCoreError, ClientError

from utils.logger import get_logger

log = get_logger(__name__)


def make_session(access_key: str, secret_key: str, region: str) -> boto3.session.Session:
    return boto3.session.Session(
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
    )


def validate_credentials(access_key: str, secret_key: str, region: str) -> dict:
    """Calls STS GetCallerIdentity. Returns {ok, account, arn, error?}."""
    try:
        sts = make_session(access_key, secret_key, region).client("sts")
        ident = sts.get_caller_identity()
        return {
            "ok": True,
            "account": ident.get("Account"),
            "arn": ident.get("Arn"),
            "user_id": ident.get("UserId"),
            "region": region,
        }
    except (BotoCoreError, ClientError) as e:
        log.warning("AWS credential validation failed: %s", e)
        return {"ok": False, "error": str(e)}
