from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class ValidateResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    valid: bool
    claims: Optional[dict[str, Any]] = None
    error: Optional[str] = None
