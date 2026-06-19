from __future__ import annotations

import base64
import json
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.asymmetric.padding import PKCS1v15
from cryptography.hazmat.primitives.hashes import SHA256

from config import Settings
from token_validator import (
    TokenValidationError,
    TokenValidator,
    decode_header,
    decode_payload_unverified,
    jwk_to_rsa_public_key,
)


ISSUER = "https://test-idp.example.com"
AUDIENCE = "test-client-id"


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def generate_rsa_key():
    private_key = rsa.generate_private_key(
        public_exponent=65537, key_size=2048, backend=default_backend()
    )
    return private_key


def private_key_to_jwk(private_key, key_id: str = "test-key-1") -> dict:
    public_numbers = private_key.public_key().public_numbers()
    modulus_b64 = _b64url_encode(public_numbers.n.to_bytes(256, "big"))
    exponent_b64 = _b64url_encode(public_numbers.e.to_bytes(3, "big"))
    return {
        "kid": key_id,
        "kty": "RSA",
        "alg": "RS256",
        "use": "sig",
        "n": modulus_b64,
        "e": exponent_b64,
    }


def sign_jwt(private_key, payload: dict, key_id: str = "test-key-1") -> str:
    header = {"alg": "RS256", "typ": "JWT", "kid": key_id}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature = private_key.sign(signing_input, PKCS1v15(), SHA256())
    signature_b64 = _b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"


def make_payload(overrides: dict | None = None, now: float | None = None) -> dict:
    current = now if now is not None else time.time()
    payload = {
        "iss": ISSUER,
        "aud": AUDIENCE,
        "sub": "user-123",
        "exp": int(current) + 3600,
        "iat": int(current),
    }
    if overrides:
        payload.update(overrides)
    return payload


class MockIdpHandler(BaseHTTPRequestHandler):
    jwks: dict = {}
    issuer: str = ISSUER

    def do_GET(self) -> None:
        if self.path == "/.well-known/openid-configuration":
            doc = {
                "issuer": self.issuer,
                "jwks_uri": f"{self.issuer}/jwks.json",
            }
            self._respond(200, doc)
        elif self.path == "/jwks.json":
            self._respond(200, self.jwks)
        else:
            self._respond(404, {"error": "not found"})

    def log_message(self, format: str, *args: object) -> None:
        return

    def _respond(self, status: int, body: dict) -> None:
        encoded = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


class MockIdpServer:
    def __init__(self, jwks: dict) -> None:
        MockIdpHandler.jwks = jwks
        self._server = ThreadingHTTPServer(("127.0.0.1", 0), MockIdpHandler)
        self._port = self._server.server_address[1]
        MockIdpHandler.issuer = self.issuer_url
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()

    @property
    def issuer_url(self) -> str:
        return f"http://127.0.0.1:{self._port}"

    def stop(self) -> None:
        self._server.shutdown()
        self._server.server_close()
        self._thread.join(timeout=5)


def _settings(issuer: str = ISSUER) -> Settings:
    return Settings(
        oidc_issuer=issuer,
        oidc_audience=AUDIENCE,
        jwks_cache_ttl_seconds=1,
        token_leeway_seconds=0,
    )


class DecodeTests(unittest.TestCase):
    def test_decode_header_returns_alg_and_kid(self) -> None:
        key = generate_rsa_key()
        token = sign_jwt(key, make_payload())
        header = decode_header(token)
        self.assertEqual(header["alg"], "RS256")
        self.assertEqual(header["kid"], "test-key-1")

    def test_decode_payload_unverified_returns_claims(self) -> None:
        key = generate_rsa_key()
        token = sign_jwt(key, make_payload({"sub": "abc"}))
        payload = decode_payload_unverified(token)
        self.assertEqual(payload["sub"], "abc")

    def test_decode_invalid_token_raises(self) -> None:
        with self.assertRaises(TokenValidationError):
            decode_header("not.a.jwt.token")


class JwkConversionTests(unittest.TestCase):
    def test_jwk_to_rsa_public_key_matches_private_key(self) -> None:
        private_key = generate_rsa_key()
        jwk = private_key_to_jwk(private_key)
        public_key = jwk_to_rsa_public_key(jwk)
        token = sign_jwt(private_key, make_payload())
        parts = token.split(".")
        signing_input = f"{parts[0]}.{parts[1]}".encode("ascii")
        import base64

        signature = base64.urlsafe_b64decode(parts[2] + "==")
        public_key.verify(signature, signing_input, PKCS1v15(), SHA256())


class TokenValidatorTests(unittest.TestCase):
    def setUp(self) -> None:
        self._private_key = generate_rsa_key()
        self._jwk = private_key_to_jwk(self._private_key)
        self._idp = MockIdpServer({"keys": [self._jwk]})

    def tearDown(self) -> None:
        self._idp.stop()

    def test_valid_token_returns_claims(self) -> None:
        settings = _settings(issuer=self._idp.issuer_url)
        validator = TokenValidator(settings)
        token = sign_jwt(self._private_key, make_payload({"iss": self._idp.issuer_url}))
        claims = validator.validate(token)
        self.assertEqual(claims["sub"], "user-123")
        self.assertEqual(claims["iss"], self._idp.issuer_url)

    def test_expired_token_raises(self) -> None:
        settings = _settings(issuer=self._idp.issuer_url)
        validator = TokenValidator(settings)
        payload = make_payload({"exp": int(time.time()) - 100, "iss": self._idp.issuer_url})
        token = sign_jwt(self._private_key, payload)
        with self.assertRaises(TokenValidationError) as ctx:
            validator.validate(token, now=time.time())
        self.assertIn("expired", str(ctx.exception).lower())

    def test_issuer_mismatch_raises(self) -> None:
        settings = Settings(
            oidc_issuer="https://wrong-issuer.example.com",
            oidc_audience=AUDIENCE,
            oidc_jwks_uri=f"{self._idp.issuer_url}/jwks.json",
            jwks_cache_ttl_seconds=1,
        )
        validator = TokenValidator(settings)
        token = sign_jwt(self._private_key, make_payload({"iss": self._idp.issuer_url}))
        with self.assertRaises(TokenValidationError) as ctx:
            validator.validate(token)
        self.assertIn("issuer", str(ctx.exception).lower())


    def test_audience_mismatch_raises(self) -> None:
        settings = _settings(issuer=self._idp.issuer_url)
        settings = settings.model_copy(update={"oidc_audience": "wrong-audience"})
        validator = TokenValidator(settings)
        token = sign_jwt(self._private_key, make_payload({"iss": self._idp.issuer_url}))
        with self.assertRaises(TokenValidationError) as ctx:
            validator.validate(token)
        self.assertIn("audience", str(ctx.exception).lower())

    def test_bad_signature_raises(self) -> None:
        other_key = generate_rsa_key()
        settings = _settings(issuer=self._idp.issuer_url)
        validator = TokenValidator(settings)
        token = sign_jwt(other_key, make_payload({"iss": self._idp.issuer_url}))
        with self.assertRaises(TokenValidationError) as ctx:
            validator.validate(token)
        self.assertIn("signature", str(ctx.exception).lower())

    def test_unsupported_algorithm_raises(self) -> None:
        settings = _settings(issuer=self._idp.issuer_url)
        validator = TokenValidator(settings)
        header = {"alg": "HS256", "typ": "JWT", "kid": "test-key-1"}
        header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
        payload_b64 = _b64url_encode(
            json.dumps(make_payload({"iss": self._idp.issuer_url}), separators=(",", ":")).encode()
        )
        token = f"{header_b64}.{payload_b64}.fake-signature"
        with self.assertRaises(TokenValidationError) as ctx:
            validator.validate(token)
        self.assertIn("algorithm", str(ctx.exception).lower())

    def test_jwks_uri_override_skips_discovery(self) -> None:
        settings = Settings(
            oidc_issuer=self._idp.issuer_url,
            oidc_audience=AUDIENCE,
            oidc_jwks_uri=f"{self._idp.issuer_url}/jwks.json",
            jwks_cache_ttl_seconds=1,
        )
        validator = TokenValidator(settings)
        token = sign_jwt(self._private_key, make_payload({"iss": self._idp.issuer_url}))
        claims = validator.validate(token)
        self.assertEqual(claims["sub"], "user-123")


class HttpAppTests(unittest.TestCase):
    def setUp(self) -> None:
        from app import create_server

        self._private_key = generate_rsa_key()
        jwk = private_key_to_jwk(self._private_key)
        self._idp = MockIdpServer({"keys": [jwk]})

        self._settings = Settings(
            host="127.0.0.1",
            port=0,
            oidc_issuer=self._idp.issuer_url,
            oidc_audience=AUDIENCE,
            jwks_cache_ttl_seconds=1,
        )
        self._server = create_server(self._settings)
        self._port = self._server.server_address[1]
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()

    def tearDown(self) -> None:
        self._server.shutdown()
        self._server.server_close()
        self._thread.join(timeout=5)
        self._idp.stop()

    def test_health_endpoint(self) -> None:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{self._port}/healthz", timeout=5
        ) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.read().decode("utf-8"), "ok")

    def test_validate_valid_token_returns_claims(self) -> None:
        token = sign_jwt(
            self._private_key, make_payload({"iss": self._idp.issuer_url})
        )
        req = urllib.request.Request(
            f"http://127.0.0.1:{self._port}/validate",
            data=b"",
            headers={"Authorization": f"Bearer {token}"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            self.assertEqual(response.status, 200)
            payload = json.loads(response.read().decode("utf-8"))
        self.assertTrue(payload["valid"])
        self.assertEqual(payload["claims"]["sub"], "user-123")

    def test_validate_missing_auth_header_returns_401(self) -> None:
        req = urllib.request.Request(
            f"http://127.0.0.1:{self._port}/validate",
            data=b"",
            method="POST",
        )
        try:
            urllib.request.urlopen(req, timeout=5)
        except urllib.error.HTTPError as error:
            self.assertEqual(error.code, 401)
        else:
            self.fail("expected HTTP 401")

    def test_validate_invalid_token_returns_401(self) -> None:
        other_key = generate_rsa_key()
        token = sign_jwt(
            other_key, make_payload({"iss": self._idp.issuer_url})
        )
        req = urllib.request.Request(
            f"http://127.0.0.1:{self._port}/validate",
            data=b"",
            headers={"Authorization": f"Bearer {token}"},
            method="POST",
        )
        try:
            urllib.request.urlopen(req, timeout=5)
        except urllib.error.HTTPError as error:
            self.assertEqual(error.code, 401)
            payload = json.loads(error.read().decode("utf-8"))
            self.assertFalse(payload["valid"])
        else:
            self.fail("expected HTTP 401")

    def test_unknown_path_returns_404(self) -> None:
        req = urllib.request.Request(
            f"http://127.0.0.1:{self._port}/unknown",
            method="POST",
            data=b"",
        )
        try:
            urllib.request.urlopen(req, timeout=5)
        except urllib.error.HTTPError as error:
            self.assertEqual(error.code, 404)
        else:
            self.fail("expected HTTP 404")


if __name__ == "__main__":
    unittest.main()
