import redis

from config import Settings
from redis_queue import RedisQueue
from worker_service import RouteWorker


def main() -> None:
    settings = Settings()
    redis_url = settings.redis_url
    if "://" not in redis_url:
        redis_url = f"redis://{redis_url}"

    rdb = redis.Redis.from_url(redis_url, decode_responses=True)
    queue = RedisQueue(rdb)
    worker = RouteWorker(queue, result_ttl_seconds=settings.result_ttl_seconds)
    worker.run_forever()


if __name__ == "__main__":
    main()
