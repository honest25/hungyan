Hunyuan Video - AI Video Generation Platform

A production-ready web-based AI video generation platform built with React, FastAPI, and MongoDB. Currently uses mock implementation with architecture ready for real Tencent Hunyuan Video integration.

## 🎯 Features

- **Text-to-Video Generation**: Convert text prompts into videos
- **Style Presets**: 4 visual styles (Cinematic, Anime, Cyberpunk, 3D Render)
- **Video Player**: Built-in preview with controls
- **Download Videos**: Export generated videos
- **Generation History**: View last 10 generations
- **Real-time Progress**: Non-linear loading indicator
- **Error Handling**: Input validation and retry system
- **Modern UI**: Clean, minimal design following Studio Light aesthetic

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19, Tailwind CSS, Framer Motion
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **Styling**: Custom design system with Outfit + DM Sans fonts

### Project Structure
```
/app
├── backend/
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
├── frontend/
│   ├── src/
│   │   ├── App.js        # Main React component
│   │   ├── App.css       # Custom styles
│   │   ├── index.css     # Global styles with Tailwind
│   │   └── components/ui/ # Shadcn UI components
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## 🚀 Local Setup

### Prerequisites
- Node.js 16+ and Yarn
- Python 3.10+
- MongoDB running locally or remote connection

### Installation

1. **Backend Setup**
```bash
cd /app/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Edit .env file with your MongoDB URL
MONGO_URL=\"mongodb://localhost:27017\"
DB_NAME=\"test_database\"
CORS_ORIGINS=\"*\"

# Start backend server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

2. **Frontend Setup**
```bash
cd /app/frontend

# Install dependencies
yarn install

# Configure environment variables
# Create .env file with:
REACT_APP_BACKEND_URL=http://localhost:8001

# Start development server
yarn start
```

3. **Access Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api
- API Docs: http://localhost:8001/docs

## 📡 API Endpoints

### Health Check
```bash
GET /api/health
```

### Generate Video
```bash
POST /api/generate-video
Content-Type: application/json

{
  \"prompt\": \"A majestic eagle soaring through mountains\",
  \"style\": \"Cinematic\"
}
```

### Get History
```bash
GET /api/history
```

## 🎨 Design System

### Typography
- **Headings**: Outfit (500, 700)
- **Body**: DM Sans (400, 500)
- **Code**: JetBrains Mono

### Colors
- Background: #FAFAFA (off-white)
- Foreground: #18181B (near-black)
- Primary: #18181B
- Muted: #F4F4F5
- Border: #E4E4E7

### Key Design Principles
- Studio Light aesthetic (no AI clichés)
- 2-3x more spacing than comfortable
- Glassmorphism effects with backdrop blur
- Micro-animations for all interactions
- Non-linear progress indicators

## 🔄 Integrating Real Hunyuan Video

The current implementation uses mock video generation. To integrate real Hunyuan Video:

### Option 1: Local Deployment
1. Install CUDA and GPU drivers
2. Install PyTorch with CUDA support
3. Clone Hunyuan Video repository
4. Download model weights (8.3B parameters, ~14GB GPU memory required)
5. Replace `mock_generate_video()` in `server.py` with:

```python
from diffusers import HunyuanVideo15Pipeline
import torch

pipeline = HunyuanVideo15Pipeline.from_pretrained(
    \"hunyuanvideo-community/HunyuanVideo-1.5-Diffusers-720p_t2v\",
    torch_dtype=torch.bfloat16
)
pipeline.enable_model_cpu_offload()
pipeline.vae.enable_tiling()
pipeline = pipeline.to(\"cuda\")

async def generate_video_real(prompt: str, style: str) -> str:
    generator = torch.Generator(device=\"cuda\").manual_seed(42)
    video = pipeline(
        prompt=prompt,
        num_frames=121,
        num_inference_steps=30,
        height=720,
        width=1280,
        generator=generator
    ).frames[0]
    
    # Save and return video URL
    video_path = f\"/tmp/video_{uuid.uuid4()}.mp4\"
    export_to_video(video, video_path, fps=24)
    return video_path
```

### Option 2: Cloud API Integration
Use Fal.ai, Replicate, or Tencent Cloud APIs:

```python
import aiohttp

FAL_API_KEY = \"your_fal_api_key\"

async def generate_video_cloud(prompt: str, style: str) -> str:
    async with aiohttp.ClientSession() as session:
        async with session.post(
            \"https://queue.fal.run/fal-ai/hunyuan-video-image-to-video/submit\",
            headers={\"Authorization\": f\"Key {FAL_API_KEY}\"},
            json={\"prompt\": prompt, \"resolution\": \"720p\"}
        ) as response:
            data = await response.json()
            request_id = data[\"request_id\"]
            
        # Poll for completion
        while True:
            async with session.get(
                f\"https://queue.fal.run/.../status/{request_id}\",
                headers={\"Authorization\": f\"Key {FAL_API_KEY}\"}
            ) as response:
                data = await response.json()
                if data[\"status\"] == \"COMPLETED\":
                    return data[\"result\"][\"video\"][\"url\"]
            await asyncio.sleep(5)
```

## 🚢 Deployment

### Deploy to Render.com (Free Tier)

1. **Backend Deployment**
   - Create new Web Service on Render
   - Connect GitHub repository
   - Set build command: `pip install -r requirements.txt`
   - Set start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - Add environment variables:
     - `MONGO_URL`: Your MongoDB connection string
     - `DB_NAME`: Database name
     - `CORS_ORIGINS`: Your frontend URL

2. **Frontend Deployment**
   - Deploy to Vercel or Netlify
   - Set build command: `yarn build`
   - Set environment variable:
     - `REACT_APP_BACKEND_URL`: Your Render backend URL

3. **Database**
   - Use MongoDB Atlas (free tier)
   - Or connect to existing MongoDB instance

### Environment Variables Checklist

**Backend (.env)**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=hunyuan_video_db
CORS_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
```

**Frontend (.env)**
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 🧪 Testing

Run backend tests:
```bash
cd /app/backend
python -m pytest backend_test.py -v
```

Test frontend manually:
1. Enter a prompt (min 10 characters)
2. Select a style preset
3. Click \"Generate Video\"
4. Wait for progress indicator
5. Video should appear in player
6. History sidebar should update
7. Test download button

## 📝 Development Notes

### Current Implementation
- Mock video generation returns sample videos from Google Cloud Storage
- Generation delay: 3-5 seconds (simulated)
- History stored in MongoDB (last 10 entries)
- No authentication required (add if needed for production)

### Future Enhancements
- User authentication and accounts
- Video queue management for high traffic
- Advanced style customization
- Longer video generation (currently ~5 seconds)
- Video editing features
- Social sharing capabilities

## 🐛 Troubleshooting

**Backend not starting:**
- Check Python version (3.10+)
- Verify MongoDB connection
- Check port 8001 is available

**Frontend not loading:**
- Run `yarn install` to update dependencies
- Check REACT_APP_BACKEND_URL is set correctly
- Clear browser cache

**Videos not generating:**
- Check backend logs: `tail -f /var/log/supervisor/backend.err.log`
- Verify MongoDB connection
- Test API directly: `curl http://localhost:8001/api/health`

## 📄 License

This project is built for demonstration purposes. Tencent Hunyuan Video model has its own license terms.

## 🤝 Contributing

This is an MVP implementation. When integrating real Hunyuan Video:
1. Review GPU requirements (14GB+ VRAM)
2. Implement proper video storage (S3, Cloud Storage)
3. Add rate limiting for API endpoints
4. Implement job queuing for concurrent requests
5. Add comprehensive error handling

---

Built with ❤️ using Emergent AI Platform
"
