import os
from typing import Annotated, Optional

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from middleware.rate_limit import limiter
from middleware.role_guard import require_role
from models.subscription import Subscription
from schemas.subscription import CheckoutRequest, SubscriptionResponse, SubscriptionTierInfo
from services.subscription_service import (
    cancel_subscription,
    create_checkout_session,
    get_tiers,
    handle_subscription_event,
)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("/tiers", response_model=list[SubscriptionTierInfo])
@limiter.limit("60/minute")
async def list_tiers(request: Request):
    return get_tiers()


@router.get("/me", response_model=Optional[SubscriptionResponse])
@limiter.limit("60/minute")
async def get_my_subscription(
    request: Request,
    ctx: Annotated[dict, Depends(require_role())],
    db: Session = Depends(get_db),
):
    return db.query(Subscription).filter(Subscription.user_id == ctx["user_id"]).first()


@router.post("/checkout")
@limiter.limit("10/minute")
async def create_checkout(
    request: Request,
    body: CheckoutRequest,
    ctx: Annotated[dict, Depends(require_role())],
):
    url = create_checkout_session(ctx["user_id"], body.tier, body.return_url)
    return {"checkout_url": url}


@router.post("/webhook")
async def subscription_webhook(
    request: Request,
    stripe_signature: Annotated[str, Header()],
    db: Session = Depends(get_db),
):
    payload = await request.body()
    secret = os.environ.get("STRIPE_SUBSCRIPTION_WEBHOOK_SECRET", "")
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    sub_events = {
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    }
    if event["type"] in sub_events:
        handle_subscription_event(db, event)
        db.commit()

    return {"received": True}


@router.delete("/me", status_code=200)
@limiter.limit("5/minute")
async def cancel_my_subscription(
    request: Request,
    ctx: Annotated[dict, Depends(require_role())],
    db: Session = Depends(get_db),
):
    cancel_subscription(db, ctx["user_id"])
    db.commit()
    return {"detail": "Subscription will cancel at end of billing period"}
