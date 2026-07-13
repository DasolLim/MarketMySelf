"""Vercel serverless entrypoint.

Vercel's Python runtime serves the ASGI ``app`` exported from this module, and
``vercel.json`` rewrites every route to it. We prepend the backend root to
``sys.path`` so the app's absolute imports (``main``, ``routers``, ``middleware``…)
resolve when this file runs from inside ``backend/api/``.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: E402,F401
