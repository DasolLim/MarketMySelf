import os
from typing import Annotated
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session

from database import get_db
from middleware.rate_limit import limiter
from models.payment import Payment
from models.section import PixelSection
from routers.auth import get_current_user_id
from schemas.payment import CreatePaymentIntentRequest, PaymentIntentResponse, PaymentResponse
from services.stripe_service import PAGE_PRICES, create_payment_intent, verify_webhook

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/intent", response_model=PaymentIntentResponse)
@limiter.limit("20/minute")
async def create_intent(
    request: Request,
    body: CreatePaymentIntentRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    section = db.query(PixelSection).filter(PixelSection.id == body.pixel_section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    if section.owner_id is not None:
        raise HTTPException(status_code=409, detail="Section already purchased")

    intent = create_payment_intent(section.page_number, str(section.id), user_id)

    db.add(Payment(
        user_id=user_id,
        pixel_section_id=section.id,
        stripe_payment_intent_id=intent.id,
        amount=PAGE_PRICES[section.page_number] / 100,
        status="pending",
    ))
    db.commit()

    return PaymentIntentResponse(
        client_secret=intent.client_secret,
        payment_intent_id=intent.id,
        amount=intent.amount,
    )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Annotated[str, Header()],
    db: Session = Depends(get_db),
):
    payload = await request.body()
    event = verify_webhook(payload, stripe_signature)

    if event["type"] == "payment_intent.succeeded":
        pi = event["data"]["object"]
        payment = db.query(Payment).filter(Payment.stripe_payment_intent_id == pi["id"]).first()
        if payment:
            payment.status = "succeeded"
            section = db.query(PixelSection).filter(PixelSection.id == payment.pixel_section_id).first()
            if section and section.owner_id is None:
                section.owner_id = payment.user_id
                section.purchased_at = datetime.now(timezone.utc)
                section.price_paid = payment.amount
            db.commit()

    elif event["type"] == "payment_intent.payment_failed":
        pi = event["data"]["object"]
        payment = db.query(Payment).filter(Payment.stripe_payment_intent_id == pi["id"]).first()
        if payment:
            payment.status = "failed"
            db.commit()

    return {"received": True}


@router.get("/history", response_model=list[PaymentResponse])
@limiter.limit("30/minute")
async def payment_history(
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    return db.query(Payment).filter(Payment.user_id == user_id).order_by(Payment.created_at.desc()).all()
