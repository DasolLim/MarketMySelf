import os
from supabase import create_client, Client

_client: Client | None = None


def get_storage_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
    return _client


def upload_profile_image(section_id: str, filename: str, data: bytes) -> str:
    client = get_storage_client()
    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "profiles")
    path = f"sections/{section_id}/{filename}"
    client.storage.from_(bucket).upload(
        path=path,
        file=data,
        file_options={"content-type": "image/webp", "upsert": "true"},
    )
    return client.storage.from_(bucket).get_public_url(path)


def delete_profile_image(image_path: str) -> None:
    client = get_storage_client()
    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "profiles")
    client.storage.from_(bucket).remove([image_path])
