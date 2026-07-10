import os
import stripe
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.subscription import Subscription

TIER_PRICES: dict[str, int] = {
    "basic":    499,
    "standard": 1499,
    "premium":  2499,
}

TIER_PRICE_IDS: dict[str, str] = {
    "basic":    os.environ.get("STRIPE_BASIC_PRICE_ID", ""),
    "standard": os.environ.get("STRIPE_STANDARD_PRICE_ID", ""),
    "premium":  os.environ.get("STRIPE_PREMIUM_PRICE_ID", ""),
}

TIER_FEATURES: dict[str, list[str]] = {
    "basic": [
        "Name display on profile",
        "Resume upload",
        "Tech skills listing",
        "Profile picture",
        "Portfolio & social links",
        "Soft skills listing",
    ],
    "standard": [
        "Everything in Basic",
        "Branding bio",
        "See who viewed your profile",
        "Recruiter notifications",
    ],
    "premium": [
        "Everything in Standard",
        "Boosted search ranking",
        "Featured on category pages",
        "Interview % indicator",
    ],
}


def get_tiers() -> list[dict]:
    return [
        {
            "tier": "basic",
            "price_cents": TIER_PRICES["basic"],
            "label": "Basic",
            "features": TIER_FEATURES["basic"],
        },
        {
            "tier": "standard",
            "price_cents": TIER_PRICES["standard"],
            "label": "Standard",
            "features": TIER_FEATURES["standard"],
        },
        {
            "tier": "premium",
            "price_cents": TIER_PRICES["premium"],
            "label": "Premium",
            "features": TIER_FEATURES["premium"],
        },
    ]


def create_checkout_session(user_id: str, tier: str, return_url: str) -> str:
    stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
    if tier not in TIER_PRICES:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {tier}")

    price_id = TIER_PRICE_IDS.get(tier)
    if price_id:
        line_item = {"price": price_id, "quantity": 1}
    else:
        line_item = {
            "price_data": {
                "currency": "usd",
                "unit_amount": TIER_PRICES[tier],
                "recurring": {"interval": "month"},
                "product_data": {"name": f"MarketMySelf {tier.title()}"},
            },
            "quantity": 1,
        }

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[line_item],
        success_url=f"{return_url}?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=return_url,
        metadata={"user_id": user_id, "tier": tier},
    )
    return session.url


def handle_subscription_event(db: Session, event: stripe.Event) -> None:
    obj = event["data"]["object"]
    stripe_sub_id = obj.get("id")
    if not stripe_sub_id:
        return

    metadata = obj.get("metadata", {})
    user_id = metadata.get("user_id")
    tier = metadata.get("tier", "basic")

    raw_status = obj.get("status", "active")
    status_map = {"active": "active", "canceled": "cancelled", "past_due": "past_due"}
    status = status_map.get(raw_status, "active")

    from datetime import datetime, timezone

    def _ts(val: int | None) -> datetime | None:
        return datetime.fromtimestamp(val, tz=timezone.utc) if val else None

    period_start = _ts(obj.get("current_period_start"))
    period_end = _ts(obj.get("current_period_end"))

    existing = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == stripe_sub_id
    ).first()

    if existing:
        existing.status = status
        existing.tier = tier
        existing.current_period_start = period_start
        existing.current_period_end = period_end
    elif user_id:
        db.add(Subscription(
            user_id=user_id,
            stripe_subscription_id=stripe_sub_id,
            tier=tier,
            status=status,
            current_period_start=period_start,
            current_period_end=period_end,
        ))

    db.flush()


def cancel_subscription(db: Session, user_id: str) -> None:
    stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
    sub = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.status == "active",
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription found")
    stripe.Subscription.cancel(sub.stripe_subscription_id, at_period_end=True)
    sub.status = "cancelled"
    db.flush()
