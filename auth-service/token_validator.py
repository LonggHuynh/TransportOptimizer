from __future__ import annotations

import json
import time
from typing import Any, Optional
from urllib.request import urlopen

from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey
from cryptography.hazmat.primitives.asymmetric.padding import PKCS1v15
from cryptography.hazmat.primitives.hashes import SHA256
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from cryptography.hazmat.backends import default_backend
import base64
import struct

from config import Settings


class TokenValidationError(Exception):
    pass


class JwksCache:
    def __init__(self, ttl_seconds: int) -> None:
        self._ttl_seconds = ttl_seconds
        self._keys: dict[str, dict[str, Any]] = {}
        self._expires_at: float = 0.0

    def get(self, key_id: str) -> Optional[dict[str, Any]]:
        if time.time() > self._expires_at:
            return None
        return self._keys.get(key_id)

    def set(self, keys: dict[str, dict[str, Any]]) -> None:
        self._keys = keys
        self._expires_at = time.time() + self._ttl_seconds

    def invalidate(self) -> None:
        self._expires_at = 0.0


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def decode_header(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise TokenValidationError("Token is not a well-formed JWT.")
    header_json = _b64url_decode(parts[0])
    return json.loads(header_json)


def decode_payload_unverified(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise TokenValidationError("Token is not a well-formed JWT.")
    payload_json = _b64url_decode(parts[1])
    return json.loads(payload_json)


def _int_from_base64url(b64data: str) -> int:
    decoded = _b64url_decode(b64data)
    return int.from_bytes(decoded, byteorder="big")


def jwk_to_rsa_public_key(jwk: dict[str, Any]) -> RSAPublicKey:
    modulus = _int_from_base64url(jwk["n"])
    exponent = _int_from_base64url(jwk["e"])
    from cryptography.hazmat.primitives.asymmetric import rsa

    return rsa.RSAPublicNumbers(exponent, modulus).public_key(default_backend())


def fetch_json(url: str, timeout: int = 10) -> dict[str, Any]:
    with urlopen(url, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


class TokenValidator:
    def __init__(self, settings: Settings, fetcher=fetch_json) -> None:
        self._settings = settings
        self._fetch = fetcher
        self._cache = JwksCache(settings.jwks_cache_ttl_seconds)
        self._jwks_uri = settings.oidc_jwks_uri or None

    def validate(self, token: str, now: float | None = None) -> dict[str, Any]:
        current_time = now if now is not None else time.time()
        header = decode_header(token)
        key_id = header.get("kid")
        alg = header.get("alg")
        if alg != "RS256":
            raise TokenValidationError(f"Unsupported algorithm: {alg}")

        jwk = self._resolve_jwk(key_id)
        public_key = jwk_to_rsa_public_key(jwk)
        _verify_signature(token, public_key)

        payload = decode_payload_unverified(token)
        self._validate_claims(payload, current_time)
        return payload

    def _resolve_jwk(self, key_id: str | None) -> dict[str, Any]:
        if key_id is not None:
            cached = self._cache.get(key_id)
            if cached is not None:
                return cached

        jwks_uri = self._resolve_jwks_uri()
        jwks = self._fetch(jwks_uri)
        keys = {k["kid"]: k for k in jwks.get("keys", []) if k.get("kid")}
        self._cache.set(keys)

        if key_id is None:
            if len(keys) == 1:
                return next(iter(keys.values()))
            raise TokenValidationError("Token header missing 'kid' and multiple JWKs found.")

        jwk = keys.get(key_id)
        if jwk is None:
            raise TokenValidationError(f"No matching JWK for kid={key_id}.")
        return jwk

    def _resolve_jwks_uri(self) -> str:
        if self._jwks_uri:
            return self._jwks_uri
        if not self._settings.oidc_issuer:
            raise TokenValidationError("OIDC issuer is not configured.")
        metadata = self._fetch(f"{self._settings.oidc_issuer.rstrip('/')}/.well-known/openid-configuration")
        uri = metadata.get("jwks_uri")
        if not uri:
            raise TokenValidationError("OIDC metadata does not contain jwks_uri.")
        self._jwks_uri = uri
        return uri

    def _validate_claims(self, payload: dict[str, Any], current_time: float) -> None:
        leeway = self._settings.token_leeway_seconds
        issuer = payload.get("iss")
        if issuer != self._settings.oidc_issuer:
            raise TokenValidationError(f"Issuer mismatch: {issuer}")

        exp = payload.get("exp")
        if exp is None:
            raise TokenValidationError("Token missing 'exp' claim.")
        if current_time > (exp + leeway):
            raise TokenValidationError("Token has expired.")

        nbf = payload.get("nbf")
        if nbf is not None and current_time < (nbf - leeway):
            raise TokenValidationError("Token is not yet valid.")

        audience = self._settings.oidc_audience
        if audience:
            token_aud = payload.get("aud")
            if token_aud is None:
                raise TokenValidationError("Token missing 'aud' claim.")
            if isinstance(token_aud, list):
                if audience not in token_aud:
                    raise TokenValidationError("Audience mismatch.")
            elif token_aud != audience:
                raise TokenValidationError("Audience mismatch.")


def _verify_signature(token: str, public_key: RSAPublicKey) -> None:
    parts = token.split(".")
    signing_input = f"{parts[0]}.{parts[1]}".encode("ascii")
    signature = _b64url_decode(parts[2])
    try:
        public_key.verify(signature, signing_input, PKCS1v15(), SHA256())
    except Exception as exc:
        raise TokenValidationError("Signature verification failed.") from exc
