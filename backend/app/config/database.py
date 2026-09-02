from motor.motor_asyncio import AsyncIOMotorClient

from app.config.settings import settings


client = AsyncIOMotorClient(settings.MONGODB_URL)

database = client[settings.DATABASE_NAME]


# Collections

users_collection = database["users"]

meetings_collection = database["meetings"]

transcripts_collection = database["transcripts"]

translations_collection = database["translations"]
chat_messages_collection = database["chat_messages"]
invitations_collection = database["invitations"]
