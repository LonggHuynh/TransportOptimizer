from __future__ import annotations

import json
import logging
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from config import Settings
from models import ValidateResponse
from token_validator import TokenValidationError, TokenValidator

logger = logging.getLogger(__name__)


class AuthHandler(BaseHTTPRequestHandler):
    _validator: TokenValidator | None = None

    @classmethod
    def configure(cls, settings: Settings) -> None:
        cls._validator = TokenValidator(settings)

    def do_POST(self) -> None:
        if self.path != "/validate":
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return

        token = self._extract_bearer_token()
        if token is None:
            self._send_json(
                HTTPStatus.UNAUTHORIZED,
                {"valid": False, "error": "Missing or malformed Authorization header."},
            )
            return

        assert self._validator is not None
        try:
            claims = self._validator.validate(token)
        except TokenValidationError as exc:
            self._send_json(
                HTTPStatus.UNAUTHORIZED,
                ValidateResponse(valid=False, error=str(exc)).model_dump(by_alias=True),
            )
            return

        self._send_json(
            HTTPStatus.OK,
            ValidateResponse(valid=True, claims=claims).model_dump(by_alias=True),
        )

    def do_GET(self) -> None:
        if self.path == "/healthz":
            self._send_plain(HTTPStatus.OK, "ok")
            return
        self._send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})

    def log_message(self, format: str, *args: object) -> None:
        return

    def _extract_bearer_token(self) -> str | None:
        auth_header = self.headers.get("Authorization", "")
        parts = auth_header.split(" ", 1)
        if len(parts) != 2 or parts[0].strip().lower() != "bearer":
            return None
        token = parts[1].strip()
        return token if token else None

    def _send_json(self, status: int, payload: dict) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _send_plain(self, status: int, text: str) -> None:
        encoded = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def create_server(settings: Settings) -> ThreadingHTTPServer:
    AuthHandler.configure(settings)
    return ThreadingHTTPServer((settings.host, settings.port), AuthHandler)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    settings = Settings()
    server = create_server(settings)
    logger.info("auth-service listening on %s:%d", settings.host, settings.port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
