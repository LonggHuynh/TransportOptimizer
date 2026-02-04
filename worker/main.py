from urllib.parse import urlparse

import google.auth
import redis
from google.auth.transport.requests import Request
from redis.cluster import RedisCluster

from config import Settings
from redis_queue import RedisQueue
from worker_service import RouteWorker


class GcpIamTokenProvider:
    def __init__(self) -> None:
        self._credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        self._request = Request()

    def get_token(self) -> str:
        if not self._credentials.valid or self._credentials.expired:
            self._credentials.refresh(self._request)
        return self._credentials.token


def _parse_redis_url(redis_url: str) -> tuple[str, int, str]:
    normalized = redis_url if "://" in redis_url else f"redis://{redis_url}"
    parsed = urlparse(normalized)
    host = parsed.hostname or "localhost"
    port = parsed.port or 6379
    return host, port, normalized


def _create_redis_client(settings: Settings):
    host, port, redis_url = _parse_redis_url(settings.redis_url)
    if not settings.redis_iam_auth_enabled:
        return redis.Redis.from_url(redis_url, decode_responses=True)

    token_provider = GcpIamTokenProvider()
    startup_nodes = [{"host": host, "port": port}]

    def redis_connect_func():
        token = token_provider.get_token()
        return redis.Redis(
            host=host,
            port=port,
            password=token,
            decode_responses=True,
        )

    return RedisCluster(
        startup_nodes=startup_nodes,
        redis_connect_func=redis_connect_func,
        decode_responses=True,
    )


def main() -> None:
    settings = Settings()
    rdb = _create_redis_client(settings)
    queue = RedisQueue(rdb)
    worker = RouteWorker(queue, result_ttl_seconds=settings.result_ttl_seconds)
    worker.run_forever()


if __name__ == "__main__":
    main()
