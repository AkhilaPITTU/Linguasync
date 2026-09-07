import uvicorn

from app.config.settings import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT.lower() != "production",
        ws_ping_interval=20,
        ws_ping_timeout=30,
    )
