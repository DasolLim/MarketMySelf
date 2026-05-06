import os
import stripe
from fastapi import HTTPException

PAGE_PRICES: dict[int, int] = {
    1: 1000,
    2:  699,
    3:  500,
}


def create_payment_intent(page_number: int, section_id: str, user_id: str) -> stripe.PaymentIntent:
    stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
    amount = PAGE_PRICES.get(page_number)
    if amount is None:
        raise HTTPException(status_code=400, detail="Invalid page number")
    return stripe.PaymentIntent.create(
        amount=amount,
        currency="usd",
        metadata={"section_id": section_id, "user_id": user_id, "page_number": str(page_number)},
        automatic_payment_methods={"enabled": True},
    )


def verify_webhook(payload: bytes, sig_header: str) -> stripe.Event:
    try:
        return stripe.Webhook.construct_event(payload, sig_header, os.environ["STRIPE_WEBHOOK_SECRET"])
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature")
