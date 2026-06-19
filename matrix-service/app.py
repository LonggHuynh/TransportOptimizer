from __future__ import annotations

import json
import logging
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from config import Settings
from matrix_service import MatrixService
from models import Coordinate, MatrixRequest, MatrixResponse

logger = logging.getLogger(__name__)


class MatrixHandler(BaseHTTPRequestHandler):
    _service: MatrixService | None = None

    @classmethod
    def configure(cls, settings: Settings) -> None:
        cls._service = MatrixService(settings)

    def do_POST(self) -> None:
        if self.path != "/matrix":
            self._send_json(
                HTTPStatus.NOT_FOUND,
                {"error": "not found"},
            )
            return

        body = self._read_body()
        try:
            request = MatrixRequest.model_validate_json(body)
        except ValueError as exc:
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                {"error": str(exc)},
            )
            return

        assert self._service is not None
        response = self._service.compute_duration_matrix(
            request.places,
            request.travel_mode,
        )
        self._send_json(HTTPStatus.OK, response.model_dump(by_alias=True, mode="json"))

    def do_GET(self) -> None:
        if self.path == "/healthz":
            self._send_plain(HTTPStatus.OK, "ok")
            return
        self._send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})

    def log_message(self, format: str, *args: object) -> None:
        return

    def _read_body(self) -> str:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length) if content_length > 0 else b""
        return raw.decode("utf-8")

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
    MatrixHandler.configure(settings)
    return ThreadingHTTPServer((settings.host, settings.port), MatrixHandler)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    settings = Settings()
    server = create_server(settings)
    logger.info("matrix-service listening on %s:%d", settings.host, settings.port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
