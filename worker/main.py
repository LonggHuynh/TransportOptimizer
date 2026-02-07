from celery_app import app


def main() -> None:
    app.worker_main(argv=["worker", "--loglevel=info"])


if __name__ == "__main__":
    main()
