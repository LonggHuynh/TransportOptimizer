FROM python:3.11-slim

WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/longghuynh/TransportOptimizer"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir pipenv

COPY Pipfile Pipfile.lock ./
RUN pipenv install --system --deploy

COPY . .

CMD ["celery", "-A", "celery_app", "worker", "--loglevel=info"]
