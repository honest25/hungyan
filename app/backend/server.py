from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import asyncio
import aiohttp

# Load env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ENV
MONGO_URL = os.getenv("MONGO_URL")
FAL_API_KEY = os.getenv("FAL_API_KEY")

# MongoDB (ASYNC - correct)
client = AsyncIOMotorClient(MONGO_URL)
db = client["hunyuan_video_db"]

# App
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ================= MODELS =================

class VideoGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=500)
    style: str = Field(default="Cinematic")

class VideoGenerationResponse(BaseModel):
    job_id: str
    status: str
    message: str
    video_url: Optional[str] = None

class PromptHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prompt: str
    style: str
    video_url: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ================= REAL AI FUNCTION =================

async def generate_video_real(prompt: str, style: str) -> str:
    try:
        async with aiohttp.ClientSession() as session:
            # Step 1: Submit
            async with session.post(
                "https://queue.fal.run/fal-ai/hunyuan-video/submit",
                headers={"Authorization": f"Key {FAL_API_KEY}"},
                json={"prompt": prompt}
            ) as response:
                data = await response.json()
                request_id = data.get("request_id")

                if not request_id:
                    raise Exception("Failed to get request_id")

            logger.info(f"Request ID: {request_id}")

            # Step 2: Poll
            while True:
                async with session.get(
                    f"https://queue.fal.run/fal-ai/hunyuan-video/status/{request_id}",
                    headers={"Authorization": f"Key {FAL_API_KEY}"}
                ) as response:
                    result = await response.json()

                    status = result.get("status")
                    logger.info(f"Status: {status}")

                    if status == "COMPLETED":
                        return result["result"]["video"]["url"]

                    elif status == "FAILED":
                        raise Exception("Video generation failed")

                await asyncio.sleep(5)

    except Exception as e:
        logger.error(f"Fal.ai Error: {str(e)}")
        raise

# ================= API =================

@api_router.post("/generate-video", response_model=VideoGenerationResponse)
async def generate_video(request: VideoGenerationRequest):
    try:
        job_id = str(uuid.uuid4())
        logger.info(f"Job started: {job_id}")

        # ✅ REAL AI CALL
        video_url = await generate_video_real(request.prompt, request.style)

        # Save history
        history_entry = PromptHistory(
            id=job_id,
            prompt=request.prompt,
            style=request.style,
            video_url=video_url
        )

        doc = history_entry.model_dump()
        doc["timestamp"] = doc["timestamp"].isoformat()

        await db.video_history.insert_one(doc)

        return VideoGenerationResponse(
            job_id=job_id,
            status="completed",
            message="Video generated successfully",
            video_url=video_url
        )

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/history", response_model=List[PromptHistory])
async def get_history():
    try:
        history = await db.video_history.find(
            {}, {"_id": 0}
        ).sort("timestamp", -1).limit(10).to_list(10)

        for entry in history:
            if isinstance(entry["timestamp"], str):
                entry["timestamp"] = datetime.fromisoformat(entry["timestamp"])

        return history

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/")
async def root():
    return {"message": "Hunyuan Video API running 🚀"}


@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "time": datetime.now(timezone.utc).isoformat()
    }

# ================= APP CONFIG =================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
