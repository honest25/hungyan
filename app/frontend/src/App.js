import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Play, Download, Loader2, Sparkles } from "lucide-react";
import "@/App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STYLE_PRESETS = [
  {
    name: "Cinematic",
    url: "https://images.unsplash.com/photo-1695114584354-13e1910d491b",
    description: "High contrast, dramatic lighting, movie scene"
  },
  {
    name: "Anime",
    url: "https://images.unsplash.com/photo-1719516937211-7d70087dd03d",
    description: "2D animation style, cel shaded"
  },
  {
    name: "Cyberpunk",
    url: "https://images.unsplash.com/photo-1758404196311-70c62a445e9c",
    description: "Neon lights, futuristic city, tech noir"
  },
  {
    name: "3D Render",
    url: "https://images.unsplash.com/photo-1763025924393-59a46f8d64bf",
    description: "Octane render, abstract, glossy"
  }
];

const VideoGenerationPage = () => {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("Cinematic");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [history, setHistory] = useState([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/history`);
      setHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        // Non-linear progress: fast then slow
        const increment = prev < 50 ? 8 : prev < 80 ? 3 : 1;
        return Math.min(prev + increment, 95);
      });
    }, 200);
    return interval;
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 10) {
      toast.error("Please enter a detailed prompt (at least 10 characters)");
      return;
    }

    setIsGenerating(true);
    const progressInterval = simulateProgress();

    try {
      const response = await axios.post(`${API}/generate-video`, {
        prompt: prompt.trim(),
        style: selectedStyle
      });

      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        setGeneratedVideo(response.data);
        setHasGenerated(true);
        fetchHistory();
        toast.success("Video generated successfully!");
        setIsGenerating(false);
        setProgress(0);
      }, 300);
    } catch (error) {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setProgress(0);
      toast.error(error.response?.data?.detail || "Failed to generate video");
    }
  };

  const handleDownload = (videoUrl) => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `video_${Date.now()}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-8 md:p-12 lg:p-16">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-12"
      >
        <h1 className="font-outfit text-4xl md:text-5xl lg:text-6xl font-bold text-[#18181B] tracking-tight mb-3">
          Hunyuan Video
        </h1>
        <p className="text-lg text-[#71717A] font-sans">
          Transform text into stunning videos with AI
        </p>
      </motion.div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-8">
          {/* Prompt Input - Animates to bottom after first generation */}
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={hasGenerated ? "order-2" : "order-1"}
          >
            <Card 
              data-testid="prompt-input-card"
              className="p-6 md:p-8 border-0 shadow-[0_8px_30px_rgba(0,0,0,0.04)] glassmorphism"
            >
              <label className="block font-outfit text-sm font-medium text-[#18181B] mb-3">
                Video Prompt
              </label>
              <Textarea
                data-testid="prompt-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your video... e.g., A majestic eagle soaring through mountain peaks at golden hour"
                className="min-h-[120px] font-mono text-sm border-0 shadow-sm focus:ring-2 focus:ring-[#18181B]/5 resize-none"
                disabled={isGenerating}
              />

              {/* Style Selector */}
              <div className="mt-6">
                <label className="block font-outfit text-sm font-medium text-[#18181B] mb-3">
                  Style Preset
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {STYLE_PRESETS.map((style) => (
                    <motion.div
                      key={style.name}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <button
                        data-testid={`style-preset-${style.name.toLowerCase()}`}
                        onClick={() => setSelectedStyle(style.name)}
                        disabled={isGenerating}
                        className={`w-full aspect-square rounded-xl overflow-hidden relative group ${
                          selectedStyle === style.name
                            ? "ring-2 ring-[#18181B] ring-offset-2"
                            : ""
                        }`}
                      >
                        <img
                          src={style.url}
                          alt={style.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white font-outfit font-medium text-sm">
                            {style.name}
                          </span>
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                data-testid="generate-button"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full mt-6 h-14 rounded-full bg-[#18181B] hover:bg-[#27272A] text-white font-outfit font-medium text-base transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Video
                  </>
                )}
              </Button>

              {/* Progress Bar */}
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4"
                >
                  <div className="loading-bar-wrapper">
                    <div
                      className="loading-bar"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-[#71717A] mt-2 text-center">
                    {progress < 30 && "Initializing..."}
                    {progress >= 30 && progress < 70 && "Generating frames..."}
                    {progress >= 70 && "Finalizing video..."}
                  </p>
                </motion.div>
              )}
            </Card>
          </motion.div>

          {/* Video Preview */}
          <AnimatePresence>
            {generatedVideo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                layout
                className="order-1"
              >
                <Card 
                  data-testid="video-preview-card"
                  className="p-0 border-0 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden"
                >
                  <div className="aspect-video bg-black relative group video-player-container">
                    <video
                      data-testid="video-player"
                      controls
                      className="w-full h-full"
                      src={generatedVideo.video_url}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="p-6 bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-mono text-sm text-[#18181B] mb-2">
                          {prompt}
                        </p>
                        <p className="text-xs text-[#71717A]">
                          Style: {selectedStyle}
                        </p>
                      </div>
                      <Button
                        data-testid="download-button"
                        onClick={() => handleDownload(generatedVideo.video_url)}
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* History Sidebar */}
        <div className="lg:col-span-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-outfit text-xl font-bold text-[#18181B] mb-4">
              Recent Generations
            </h2>
            <div className="space-y-3" data-testid="history-section">
              {history.length === 0 ? (
                <Card className="p-6 border-0 shadow-sm text-center">
                  <p className="text-sm text-[#71717A]">
                    No videos generated yet
                  </p>
                </Card>
              ) : (
                history.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      data-testid={`history-item-${index}`}
                      className="p-4 border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => setGeneratedVideo(item)}
                    >
                      <div className="flex gap-3">
                        <div className="w-20 h-20 rounded-lg bg-black flex-shrink-0 overflow-hidden relative">
                          <video
                            src={item.video_url}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs text-[#18181B] line-clamp-2 mb-1">
                            {item.prompt}
                          </p>
                          <p className="text-xs text-[#71717A]">
                            {item.style}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VideoGenerationPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
