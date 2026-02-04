from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    redis_url: str = "localhost:6379"
    redis_iam_auth_enabled: bool = False
    result_ttl_seconds: int = 300
