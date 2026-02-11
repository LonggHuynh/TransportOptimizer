import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

from celery_app import app


class _HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path == "/healthz":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"ok")
            return

        self.send_response(HTTPStatus.NOT_FOUND)
        self.end_headers()

    def log_message(self, format: str, *args: object) -> None:
        return


def _start_health_server() -> ThreadingHTTPServer:
    host = os.getenv("WORKER_HEALTH_HOST", "0.0.0.0")
    port = int(os.getenv("WORKER_HEALTH_PORT", "8081"))
    server = ThreadingHTTPServer((host, port), _HealthHandler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def main() -> None:
    server = _start_health_server()
    try:
        app.worker_main(argv=["worker", "--loglevel=info"])
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
