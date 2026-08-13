from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config.database import client
from app.config.settings import settings

# ==========================================
# ROUTERS
# ==========================================

from app.routes.auth_routes import router as auth_router
from app.routes.dashboard_routes import router as dashboard_router
from app.routes.profile_routes import router as profile_router
from app.routes.translation_routes import router as translation_router
from app.routes.call_history_routes import router as call_history_router
from app.routes.invitation_routes import router as invitation_router
from app.routes.translation_history_routes import (
    router as translation_history_router
)
from app.routes.exported_chats_routes import (
    router as exported_chats_router
)
from app.routes.recent_activity_routes import (
    router as recent_activity_router
)
from app.routes.system_status_routes import (
    router as system_status_router
)
from app.routes.translation_engine_routes import (
    router as translation_engine_router
)
from app.routes.meeting_routes import router as meeting_router
from app.routes.conversation_export_routes import router as conversation_export_router
from app.routes.speech_to_text_routes import (
    router as speech_router
)
from app.routes.text_to_speech_routes import (
    router as tts_router
)
from app.routes.realtime_translation_routes import (
    router as realtime_router
)

# ==========================================
# WEBSOCKET
# ==========================================

from app.websocket.meeting_socket import (
    router as websocket_router
)

# ==========================================
# APPLICATION LIFESPAN
# ==========================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    print("=" * 60)
    print("🚀 LINGUASYNC Backend Started")
    print("=" * 60)

    try:
        await client.admin.command("ping")
        print("✅ MongoDB Connected Successfully")

    except Exception as e:
        print(f"❌ MongoDB Connection Failed : {e}")

    yield

    client.close()

    print("=" * 60)
    print("🛑 LINGUASYNC Backend Stopped")
    print("=" * 60)

# ==========================================
# FASTAPI
# ==========================================

app = FastAPI(
    title="LINGUASYNC API",
    description="Real-Time Multilingual Speech Translation Platform",
    version="1.0.0",
    lifespan=lifespan
)

app.mount(
    "/generated_audio",
    StaticFiles(directory="generated_audio"),
    name="generated_audio",
)

# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
    ],
    allow_origin_regex=r"^https?://(?:localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(?::\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# ==========================================
# REGISTER ROUTERS
# ==========================================

routers = [

    auth_router,
    dashboard_router,
    profile_router,
    translation_router,
    call_history_router,

    # Invitation
    invitation_router,

    translation_history_router,
    exported_chats_router,
    recent_activity_router,
    system_status_router,
    translation_engine_router,
    meeting_router,
    conversation_export_router,
    speech_router,
    tts_router,
    realtime_router,

    # WebSocket
    websocket_router

]

for router in routers:
    app.include_router(router)

# ==========================================
# ROOT
# ==========================================

@app.get("/")
async def home():

    return {
        "application": "LINGUASYNC",
        "status": "Running",
        "version": "1.0.0"
    }

# ==========================================
# HEALTH
# ==========================================

@app.get("/health")
async def health():

    return {
        "status": "healthy",
        "database": "connected",
        "service": "LINGUASYNC API",
        "version": "1.0.0"
    }
