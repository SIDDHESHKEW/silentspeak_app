# ============================================================
# app.py — SilentSpeak FastAPI Backend
# ============================================================
#
# Responsibilities:
#   - Load model + resources once at server startup
#   - GET  /videos   → list available demo videos
#   - POST /predict  → run inference on a selected demo video
#   - GET  /health   → confirm server + model are ready
#
# Run with:
#   uvicorn app:app --reload
# ============================================================

import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
import logging
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from inference import load_resources, run_silentspeak

# ── Logging setup ─────────────────────────────────────────────
logging.basicConfig(
    level  = logging.INFO,
    format = "%(asctime)s  %(levelname)s  %(message)s",
)
log = logging.getLogger("silentspeak")

# ── Paths ─────────────────────────────────────────────────────
MODEL_PATH      = os.path.join("model", "silentspeak_demo.keras")
LABEL_MAP_PATH  = os.path.join("model", "label_map.npy")
DEMO_VIDEOS_DIR = os.path.join("assets", "demo_videos")
VIZ_OUTPUT_DIR  = os.path.join("assets", "viz_output")

SUPPORTED_EXTENSIONS = {".mpg", ".mp4", ".avi", ".mpeg", ".mov"}

# ── Global state — populated at startup ───────────────────────
_resources: dict = {}


# ── Lifespan: load model once at startup ──────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan handler.
    Runs load_resources() once when the server starts.
    Keeps model + resources in memory for all requests.
    """
    log.info("=" * 52)
    log.info("  SILENTSPEAK BACKEND — STARTING UP")
    log.info("=" * 52)

    # Validate critical paths before loading
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(
            f"Model file not found: {MODEL_PATH}\n"
            "Place silentspeak_demo.keras inside the model/ folder."
        )
    if not os.path.exists(LABEL_MAP_PATH):
        raise RuntimeError(
            f"Label map not found: {LABEL_MAP_PATH}\n"
            "Place label_map.npy inside the model/ folder."
        )

    os.makedirs(DEMO_VIDEOS_DIR, exist_ok=True)
    os.makedirs(VIZ_OUTPUT_DIR,  exist_ok=True)

    log.info("Loading model and resources...")
    _resources.update(
        load_resources(
            model_path     = MODEL_PATH,
            label_map_path = LABEL_MAP_PATH,
            viz_output_dir = VIZ_OUTPUT_DIR,
        )
    )
    log.info("Model loaded successfully. Server is ready.")
    log.info("=" * 52)

    yield   # server is running — handle requests

    # Shutdown
    log.info("SilentSpeak backend shutting down.")
    _resources.clear()


# ── FastAPI app ───────────────────────────────────────────────
app = FastAPI(
    title       = "SilentSpeak API",
    description = "AI lip-reading inference backend.",
    version     = "1.0.0",
    lifespan    = lifespan,
)

# ── CORS — allow React dev server (localhost:5173 / 3000) ─────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:3000",
                         "http://localhost:5173",
                         "http://127.0.0.1:3000",
                         "http://127.0.0.1:5173"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Serve viz images as static files ─────────────────────────
app.mount(
    "/viz",
    StaticFiles(directory=VIZ_OUTPUT_DIR),
    name="viz",
)

app.mount("/assets", StaticFiles(directory="assets"), name="assets")


# ============================================================
# REQUEST / RESPONSE MODELS
# ============================================================

class PredictRequest(BaseModel):
    video_name: str   # e.g. "lgwg2n.mpg"


class Top3Item(BaseModel):
    label      : str
    probability: float


class PredictResponse(BaseModel):
    sentence    : str
    label       : Optional[str]
    confidence  : float
    source_used : str
    top3        : List[Top3Item]
    viz_paths   : List[str]
    video_path  : str


class VideoListResponse(BaseModel):
    videos: List[str]


class HealthResponse(BaseModel):
    status     : str
    model_ready: bool
    video_count: int


# ============================================================
# ENDPOINTS
# ============================================================

# ── GET /health ───────────────────────────────────────────────
@app.get(
    "/health",
    response_model = HealthResponse,
    summary        = "Server and model health check",
)
def health():
    """
    Returns server status and confirms the model is loaded.
    Useful for the frontend to check backend availability.
    """
    video_count = len([
        f for f in os.listdir(DEMO_VIDEOS_DIR)
        if os.path.splitext(f)[1].lower() in SUPPORTED_EXTENSIONS
    ]) if os.path.exists(DEMO_VIDEOS_DIR) else 0

    return HealthResponse(
        status      = "ok",
        model_ready = bool(_resources),
        video_count = video_count,
    )


# ── GET /videos ───────────────────────────────────────────────
@app.get(
    "/videos",
    response_model = VideoListResponse,
    summary        = "List available demo videos",
)
def list_videos():
    """
    Scan the demo_videos folder and return all supported
    video filenames. The React frontend uses this to populate
    the dropdown selector.

    Returns
    -------
    { "videos": ["lgwg2n.mpg", "lgbs7s.mpg", ...] }
    """
    if not os.path.exists(DEMO_VIDEOS_DIR):
        log.warning(f"Demo videos directory not found: {DEMO_VIDEOS_DIR}")
        return VideoListResponse(videos=[])

    video_files = sorted([
        f for f in os.listdir(DEMO_VIDEOS_DIR)
        if os.path.splitext(f)[1].lower() in SUPPORTED_EXTENSIONS
    ])

    log.info(f"GET /videos → {len(video_files)} videos found")
    return VideoListResponse(videos=video_files)


# ── POST /predict ─────────────────────────────────────────────
@app.post(
    "/predict",
    response_model = PredictResponse,
    summary        = "Run lip-reading inference on a demo video",
)
def predict(request: PredictRequest):
    """
    Run the full SilentSpeak inference pipeline on a selected
    demo video and return the prediction result.

    Request body
    ------------
    { "video_name": "lgwg2n.mpg" }

    Returns
    -------
    PredictResponse — sentence, confidence, source, top3, viz
    """
    log.info(f"POST /predict  video={request.video_name}")

    # ── Validate model is loaded ──────────────────────────────
    if not _resources:
        raise HTTPException(
            status_code = 503,
            detail      = "Model not loaded. Server may still be starting."
        )

    # ── Sanitise filename — no path traversal ─────────────────
    video_name = os.path.basename(request.video_name)
    if not video_name:
        raise HTTPException(
            status_code = 400,
            detail      = "video_name must not be empty."
        )

    ext = os.path.splitext(video_name)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code = 400,
            detail      = (
                f"Unsupported file type '{ext}'. "
                f"Allowed: {sorted(SUPPORTED_EXTENSIONS)}"
            )
        )

    # ── Build full video path ─────────────────────────────────
    video_path = os.path.join(DEMO_VIDEOS_DIR, video_name)

    if not os.path.exists(video_path):
        log.warning(f"Video not found: {video_path}")
        raise HTTPException(
            status_code = 404,
            detail      = f"Video '{video_name}' not found in demo library."
        )

    # ── Run inference ─────────────────────────────────────────
    log.info(f"Running inference on: {video_name}")
    try:
        result = run_silentspeak(
            source_type = "grid",
            resources   = _resources,
            video_path  = video_path,
        )
    except Exception as e:
        log.error(f"Inference failed for {video_name}: {e}", exc_info=True)
        raise HTTPException(
            status_code = 500,
            detail      = f"Inference failed: {str(e)}"
        )

    # ── Serialize top3 ────────────────────────────────────────
    top3_items = [
        Top3Item(label=lbl, probability=round(prob, 4))
        for lbl, prob in (result.get("top3") or [])
    ]

    # ── Convert viz_paths to URL paths ────────────────────────
    # Frontend will load these from the /viz static mount
    viz_urls = []
    for path in (result.get("viz_paths") or []):
        filename = os.path.basename(path)
        viz_urls.append(f"/viz/{filename}")

    response = PredictResponse(
        sentence    = result.get("sentence")    or "",
        label       = result.get("label"),
        confidence  = round(result.get("confidence") or 0.0, 4),
        source_used = result.get("source_used") or "unknown",
        top3        = top3_items,
        viz_paths   = viz_urls,
        video_path  = video_path,
    )

    log.info(
        f"Prediction complete: '{response.sentence}' "
        f"({response.confidence:.2%}) via {response.source_used}"
    )
    return response
