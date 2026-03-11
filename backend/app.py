# ============================================================
# app.py — SilentSpeak FastAPI Backend
# ============================================================
#
# Responsibilities:
#   - Load model + resources once at server startup
#   - GET  /videos          → list available demo videos
#   - POST /predict         → run inference on a selected demo video
#   - POST /predict/upload  → run inference on an uploaded/webcam video
#   - GET  /health          → confirm server + model are ready
#
# Run with:
#   uvicorn app:app --reload
# ============================================================

import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['KMP_DUPLICATE_LIB_OK']  = 'TRUE'

import uuid
import shutil
import logging
import subprocess
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi            import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors    import CORSMiddleware
from fastapi.staticfiles        import StaticFiles
from fastapi.responses          import FileResponse
from pydantic           import BaseModel

from inference import load_resources, run_silentspeak

# ── Logging ───────────────────────────────────────────────────
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
UPLOAD_TEMP_DIR = os.path.join("assets", "uploads_temp")

SUPPORTED_EXTENSIONS = {".mpg", ".mp4", ".avi", ".mpeg", ".mov", ".webm"}

WHISPER_CONFIDENCE_THRESHOLD = 0.70

# ── Global state ──────────────────────────────────────────────
_resources: dict = {}


# ── Lifespan ──────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("=" * 52)
    log.info("  SILENTSPEAK BACKEND — STARTING UP")
    log.info("=" * 52)

    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"Model file not found: {MODEL_PATH}")
    if not os.path.exists(LABEL_MAP_PATH):
        raise RuntimeError(f"Label map not found: {LABEL_MAP_PATH}")

    os.makedirs(DEMO_VIDEOS_DIR, exist_ok=True)
    os.makedirs(VIZ_OUTPUT_DIR,  exist_ok=True)
    os.makedirs(UPLOAD_TEMP_DIR, exist_ok=True)

    log.info("Loading model and resources...")
    _resources.update(
        load_resources(
            model_path     = MODEL_PATH,
            label_map_path = LABEL_MAP_PATH,
            viz_output_dir = VIZ_OUTPUT_DIR,
        )
    )
    log.info("Model loaded. Server is ready.")
    log.info("=" * 52)

    yield

    log.info("SilentSpeak backend shutting down.")
    _resources.clear()


# ── FastAPI app ───────────────────────────────────────────────
app = FastAPI(
    title       = "SilentSpeak API",
    description = "AI lip-reading inference backend.",
    version     = "1.0.0",
    lifespan    = lifespan,
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Static file mounts ────────────────────────────────────────
app.mount("/viz",    StaticFiles(directory=VIZ_OUTPUT_DIR),  name="viz")
app.mount("/assets", StaticFiles(directory="assets"),        name="assets")


# ============================================================
# HELPERS
# ============================================================

def _ffmpeg_available() -> bool:
    """Check if ffmpeg is installed on the system."""
    return shutil.which("ffmpeg") is not None


def _convert_to_mp4(input_path: str, output_path: str) -> bool:
    """
    Convert any video to H.264 MP4 using ffmpeg.
    Returns True on success, False on failure.
    This is required because browsers cannot play .mpg natively.
    """
    if not _ffmpeg_available():
        log.warning("ffmpeg not found — video conversion skipped.")
        return False
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", input_path,
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-movflags", "+faststart",
                output_path,
            ],
            capture_output = True,
            timeout        = 60,
        )
        if result.returncode != 0:
            log.error(f"ffmpeg error: {result.stderr.decode()}")
            return False
        return True
    except subprocess.TimeoutExpired:
        log.error("ffmpeg conversion timed out.")
        return False
    except Exception as e:
        log.error(f"ffmpeg exception: {e}")
        return False


def _cleanup_temp(path: str):
    """Safely delete a temporary file."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


# ============================================================
# MODELS
# ============================================================

class PredictRequest(BaseModel):
    video_name: str


class Top3Item(BaseModel):
    label      : str
    confidence : float


class PredictResponse(BaseModel):
    sentence    : str
    label       : Optional[str]
    confidence  : float
    source      : str          # 'lip_reading' or 'speech_fallback'
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
# SHARED INFERENCE HELPER
# ============================================================

def _run_inference(video_path: str, source_type: str) -> PredictResponse:
    """
    Shared inference logic used by both /predict and /predict/upload.

    Flow:
      1. Call run_silentspeak() from inference.py
      2. Read confidence from result
      3. If confidence < WHISPER_CONFIDENCE_THRESHOLD → Whisper fallback
         was triggered inside inference.py; log it here for visibility
      4. Normalise result fields and return PredictResponse
    """
    if not _resources:
        raise HTTPException(
            status_code = 503,
            detail      = "Model not loaded. Server may still be starting.",
        )

    try:
        result = run_silentspeak(
            source_type = source_type,
            resources   = _resources,
            video_path  = video_path,
        )
    except Exception as e:
        log.error(f"Inference failed: {e}", exc_info=True)
        raise HTTPException(
            status_code = 500,
            detail      = f"Inference failed: {str(e)}",
        )

    # ── Whisper fallback detection + logging ──────────────────
    raw_confidence = float(result.get("confidence") or 0.0)
    source_raw     = (
        result.get("source")      or
        result.get("source_used") or
        "lip_reading"
    )
    is_whisper_fallback = (
        "whisper" in source_raw.lower() or
        "speech"  in source_raw.lower() or
        raw_confidence < WHISPER_CONFIDENCE_THRESHOLD
    )

    if is_whisper_fallback:
        print("Whisper fallback triggered")
        log.warning(
            f"Whisper fallback triggered — confidence={raw_confidence:.2%} "
            f"(threshold={WHISPER_CONFIDENCE_THRESHOLD:.0%})  "
            f"source='{source_raw}'"
        )
    else:
        log.info(
            f"Lip-reading used — confidence={raw_confidence:.2%}  "
            f"source='{source_raw}'"
        )

    # ── Normalise source field ────────────────────────────────
    source = "speech_fallback" if is_whisper_fallback else "lip_reading"

    # ── Normalise top3 ────────────────────────────────────────
    raw_top3   = result.get("top3") or []
    top3_items = []
    for item in raw_top3:
        if isinstance(item, (list, tuple)) and len(item) == 2:
            top3_items.append(Top3Item(label=str(item[0]), confidence=round(float(item[1]), 4)))
        elif isinstance(item, dict):
            lbl  = item.get("label") or item.get("sentence") or ""
            prob = item.get("confidence") or item.get("probability") or 0.0
            top3_items.append(Top3Item(label=str(lbl), confidence=round(float(prob), 4)))

    # ── Normalise viz_paths → /viz/<filename> URLs ────────────
    viz_urls = []
    for path in (result.get("viz_paths") or []):
        filename = os.path.basename(path)
        viz_urls.append(f"/viz/{filename}")

    return PredictResponse(
        sentence   = result.get("sentence") or result.get("predicted_sentence") or "",
        label      = result.get("label"),
        confidence = round(raw_confidence, 4),
        source     = source,
        top3       = top3_items,
        viz_paths  = viz_urls,
        video_path = video_path,
    )


# ============================================================
# ENDPOINTS
# ============================================================

# ── GET /health ───────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse)
def health():
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
@app.get("/videos", response_model=VideoListResponse)
def list_videos():
    """Return list of demo video filenames for the frontend dropdown."""
    if not os.path.exists(DEMO_VIDEOS_DIR):
        return VideoListResponse(videos=[])

    video_files = sorted([
        f for f in os.listdir(DEMO_VIDEOS_DIR)
        if os.path.splitext(f)[1].lower() in SUPPORTED_EXTENSIONS
    ])

    log.info(f"GET /videos → {len(video_files)} videos")
    return VideoListResponse(videos=video_files)


# ── GET /videos/stream/{filename} — browser-playable MP4 ─────
@app.get("/videos/stream/{filename}")
def stream_video(filename: str):
    """
    Serve a browser-playable MP4 version of a demo video.
    Converts .mpg → .mp4 on first request and caches the result.
    The frontend uses this URL for the <video> preview element.
    """
    filename   = os.path.basename(filename)
    orig_path  = os.path.join(DEMO_VIDEOS_DIR, filename)

    if not os.path.exists(orig_path):
        raise HTTPException(status_code=404, detail=f"Video '{filename}' not found.")

    # If already MP4, serve directly
    if filename.lower().endswith(".mp4"):
        return FileResponse(orig_path, media_type="video/mp4")

    # Check for cached converted version
    base_name    = os.path.splitext(filename)[0]
    mp4_filename = f"{base_name}_converted.mp4"
    mp4_path     = os.path.join(DEMO_VIDEOS_DIR, mp4_filename)

    if not os.path.exists(mp4_path):
        log.info(f"Converting {filename} → {mp4_filename} for browser playback...")
        success = _convert_to_mp4(orig_path, mp4_path)
        if not success:
            log.warning("Serving original file without conversion.")
            return FileResponse(orig_path, media_type="video/mpeg")

    return FileResponse(mp4_path, media_type="video/mp4")


# ── POST /predict — demo video inference ─────────────────────
@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    """Run inference on a selected GRID demo video."""
    log.info(f"POST /predict  video={request.video_name}")

    video_name = os.path.basename(request.video_name)
    if not video_name:
        raise HTTPException(status_code=400, detail="video_name must not be empty.")

    ext = os.path.splitext(video_name)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'.")

    video_path = os.path.join(DEMO_VIDEOS_DIR, video_name)
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail=f"Video '{video_name}' not found.")

    response = _run_inference(video_path, source_type="grid")
    log.info(f"Prediction: '{response.sentence}' ({response.confidence:.2%}) via {response.source}")
    return response


# ── POST /predict/upload — upload / webcam inference ─────────
@app.post("/predict/upload", response_model=PredictResponse)
async def predict_upload(file: UploadFile = File(...)):
    """
    Receive an uploaded video file (or webcam blob) and run inference.

    Accepts:
      - Any video file upload from the browser file picker
      - A recorded webcam blob sent as multipart/form-data
      - Field name must be 'file'

    The file is saved to a temporary location, inference runs,
    then the temp file is cleaned up.
    """
    log.info(f"POST /predict/upload  filename={file.filename}  content_type={file.content_type}")

    # ── Validate ──────────────────────────────────────────────
    if not _resources:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    # Determine extension — webcam blobs may have no extension
    original_name = file.filename or "upload"
    ext           = os.path.splitext(original_name)[1].lower()

    # Fallback: infer extension from content type
    if not ext or ext not in SUPPORTED_EXTENSIONS:
        ct = (file.content_type or "").lower()
        if   "webm" in ct:  ext = ".webm"
        elif "mp4"  in ct:  ext = ".mp4"
        elif "mpeg" in ct or "mpg" in ct: ext = ".mpg"
        elif "avi"  in ct:  ext = ".avi"
        elif "mov"  in ct or "quicktime" in ct: ext = ".mov"
        else:               ext = ".webm"  # safe default for webcam

    # ── Save temp file ────────────────────────────────────────
    temp_name = f"upload_{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(UPLOAD_TEMP_DIR, temp_name)

    try:
        with open(temp_path, "wb") as f:
            contents = await file.read()
            f.write(contents)
        log.info(f"Saved temp file: {temp_path}  size={len(contents)} bytes")
    except Exception as e:
        _cleanup_temp(temp_path)
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    # ── Run inference ─────────────────────────────────────────
    try:
        response = _run_inference(temp_path, source_type="upload")
        log.info(f"Upload prediction: '{response.sentence}' ({response.confidence:.2%}) via {response.source}")
        return response
    finally:
        # Always clean up temp file regardless of success or failure
        _cleanup_temp(temp_path)