from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class CreatePaymentIntentRequest(BaseModel):
    pixel_section_id: UUID


class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    amount: int


class PaymentResponse(BaseModel):
    id: UUID
    user_id: UUID
    pixel_section_id: UUID
    stripe_payment_intent_id: str
    amount: float
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
