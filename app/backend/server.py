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
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
from pymongo import MongoClient

MONGO_URL = os.getenv("MONGO_URL")

client = MongoClient(MONGO_URL)
db = client["hunyuan_video_db"]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
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

# Mock video generation service
async def mock_generate_video(prompt: str, style: str) -> str:
    """
    Mock video generation with simulated delay.
    In production, this would call Hunyuan Video API or local model.
    """
    logger.info(f"Generating video for prompt: {prompt[:50]}... with style: {style}")
    
    # Simulate generation delay (3-5 seconds)
    await asyncio.sleep(random.uniform(3, 5))
    
    # Return a mock video URL (placeholder)
    # In production, this would be actual generated video
    mock_videos = [
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
    ]
    
    return random.choice(mock_videos)

@api_router.post("/generate-video", response_model=VideoGenerationResponse)
async def generate_video(request: VideoGenerationRequest):
    """
    Generate video from text prompt.
    Currently uses mock implementation with architecture ready for real Hunyuan Video integration.
    """
    try:
        job_id = str(uuid.uuid4())
        logger.info(f"Video generation request received: job_id={job_id}")
        
        # Generate video (mock)
        video_url = await mock_generate_video(request.prompt, request.style)
        
        # Store in history
        history_entry = PromptHistory(
            id=job_id,
            prompt=request.prompt,
            style=request.style,
            video_url=video_url
        )
        
        doc = history_entry.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        await db.video_history.insert_one(doc)
        
        logger.info(f"Video generated successfully: job_id={job_id}")
        
        return VideoGenerationResponse(
            job_id=job_id,
            status="completed",
            message="Video generated successfully",
            video_url=video_url
        )
        
    except Exception as e:
        logger.error(f"Video generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Generation failed: {str(e)}"
        )

@api_router.get("/history", response_model=List[PromptHistory])
async def get_history():
    """
    Get last 10 video generation history entries.
    """
    try:
        history = await db.video_history.find(
            {}, 
            {"_id": 0}
        ).sort("timestamp", -1).limit(10).to_list(10)
        
        # Convert ISO string timestamps back to datetime
        for entry in history:
            if isinstance(entry['timestamp'], str):
                entry['timestamp'] = datetime.fromisoformat(entry['timestamp'])
        
        return history
        
    except Exception as e:
        logger.error(f"Failed to fetch history: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch history: {str(e)}"
        )

@api_router.get("/")
async def root():
    return {"message": "Hunyuan Video Generation API", "status": "ready"}

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
