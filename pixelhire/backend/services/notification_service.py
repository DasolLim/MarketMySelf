from sqlalchemy.orm import Session

from models.notification import Notification
from models.application import Application


def notify_user(db: Session, user_id: str, type: str, subject: str, body: str) -> Notification:
    note = Notification(
        user_id=user_id,
        type=type,
        subject=subject,
        body=body,
    )
    db.add(note)
    db.flush()
    return note


def notify_application_status(db: Session, application: Application) -> None:
    status_labels = {
        "viewed": "Your application has been viewed",
        "shortlisted": "You have been shortlisted",
        "rejected": "Application status update",
    }
    subject = status_labels.get(application.status, "Application status update")
    body = f"Your application status has been updated to: {application.status}."
    notify_user(
        db,
        user_id=str(application.seeker_id),
        type="status_change",
        subject=subject,
        body=body,
    )
    application.notification_sent = True
