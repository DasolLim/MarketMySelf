from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class SubscriptionTierInfo(BaseModel):
    tier: str
    price_cents: int
    label: str
    features: list[str]


class SubscriptionResponse(BaseModel):
    id: UUID
    user_id: UUID
    stripe_subscription_id: str
    tier: str
    status: str
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CheckoutRequest(BaseModel):
    tier: str
    return_url: str
