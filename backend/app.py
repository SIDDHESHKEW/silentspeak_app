# ============================================================
# app.py — SilentSpeak FastAPI Backend
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

from fastapi                 import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles     import StaticFiles
from fastapi.responses       import FileResponse
from pydantic                import BaseModel

import whisper
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

SUPPORTED_EXTENSIONS         = {".mpg", ".mp4", ".avi", ".mpeg", ".mov", ".webm"}
WHISPER_CONFIDENCE_THRESHOLD = 0.70

# ── viz_output cleanup config ─────────────────────────────────
# Max number of inference-generated files allowed in viz_output.
# sample_*.jpg are ALWAYS protected and never counted or deleted.
VIZ_MAX_FILES = 60

# The 3 permanent dashboard sample filenames — never deleted
VIZ_SAMPLE_FILES = {
    "sample_original.jpg",
    "sample_detect.jpg",
    "sample_lip.jpg",
}

# ── Global state ──────────────────────────────────────────────
_resources: dict = {}


# ============================================================
# VIZ OUTPUT HELPERS
# ============================================================

def _seed_sample_images(viz_paths: List[str]) -> None:
    """
    After the first successful inference, copy one frame of each
    type into the three permanent dashboard sample files.

    Only runs if any sample file is missing — never overwrites
    an existing sample so the dashboard stays stable.

    viz_paths: list of absolute or relative paths written by
               inference.py, e.g. [..._original.jpg, ..._detect.jpg,
               ..._lip.jpg, ...]
    """
    targets = {
        "original": os.path.join(VIZ_OUTPUT_DIR, "sample_original.jpg"),
        "detect":   os.path.join(VIZ_OUTPUT_DIR, "sample_detect.jpg"),
        "lip":      os.path.join(VIZ_OUTPUT_DIR, "sample_lip.jpg"),
    }

    # Skip entirely if all three already exist
    if all(os.path.exists(p) for p in targets.values()):
        return

    # Build lookup: suffix-keyword → first matching path
    found = {}
    for path in viz_paths:
        fname = os.path.basename(path)
        for key in ("original", "detect", "lip"):
            if key not in found and f"_{key}." in fname:
                found[key] = path

    for key, dest in targets.items():
        if os.path.exists(dest):
            continue                         # already seeded, keep it
        src = found.get(key)
        if src and os.path.exists(src):
            try:
                shutil.copy2(src, dest)
                log.info(f"Seeded dashboard sample: {dest}")
            except Exception as e:
                log.warning(f"Could not seed {dest}: {e}")


def _cleanup_viz_output() -> None:
    """
    Keep viz_output tidy. Rules:
      - sample_*.jpg are NEVER touched
      - Count all other .jpg files
      - If count > VIZ_MAX_FILES, delete oldest (by mtime) until
        count == VIZ_MAX_FILES
    """
    if not os.path.exists(VIZ_OUTPUT_DIR):
        return

    all_files = []
    for fname in os.listdir(VIZ_OUTPUT_DIR):
        if not fname.lower().endswith(".jpg"):
            continue
        if fname in VIZ_SAMPLE_FILES:
            continue                         # protected — never delete
        full = os.path.join(VIZ_OUTPUT_DIR, fname)
        if os.path.isfile(full):
            all_files.append(full)

    overflow = len(all_files) - VIZ_MAX_FILES
    if overflow <= 0:
        return

    # Sort oldest-first by modification time
    all_files.sort(key=lambda p: os.path.getmtime(p))

    deleted = 0
    for path in all_files[:overflow]:
        try:
            os.remove(path)
            deleted += 1
        except Exception as e:
            log.warning(f"Could not delete viz file {path}: {e}")

    log.info(
        f"viz_output cleanup: removed {deleted} file(s), "
        f"{len(all_files) - deleted} remain "
        f"(limit={VIZ_MAX_FILES}, protected={len(VIZ_SAMPLE_FILES)})"
    )


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
    log.info("TF model loaded.")

    log.info("Loading Whisper model (base)...")
    try:
        whisper_model = whisper.load_model("base")
        _resources["whisper_model"] = whisper_model
        log.info("Whisper model loaded successfully.")
    except Exception as e:
        log.error(f"Whisper failed to load: {e}")
        log.warning(
            "Whisper unavailable — low-confidence predictions will "
            "return lip-reading result instead of speech fallback."
        )
        _resources["whisper_model"] = None

    log.info("Server is ready.")
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
app.mount("/viz",    StaticFiles(directory=VIZ_OUTPUT_DIR), name="viz")
app.mount("/assets", StaticFiles(directory="assets"),       name="assets")


# ============================================================
# HELPERS
# ============================================================

def _ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def _convert_to_mp4(input_path: str, output_path: str) -> bool:
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
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


# ============================================================
# PYDANTIC MODELS
# ============================================================

class PredictRequest(BaseModel):
    video_name: str


class Top3Item(BaseModel):
    label      : str
    confidence : float


class PredictResponse(BaseModel):
    sentence   : str
    label      : Optional[str]
    confidence : float
    source     : str
    top3       : List[Top3Item]
    viz_paths  : List[str]
    video_path : str


class VideoListResponse(BaseModel):
    videos: List[str]


class HealthResponse(BaseModel):
    status        : str
    model_ready   : bool
    whisper_ready : bool
    video_count   : int


# ============================================================
# RESULT NORMALISER
# ============================================================

def _normalise_result(result: dict, video_path: str) -> PredictResponse:
    raw_confidence = float(result.get("confidence") or 0.0)

    source_raw = (
        result.get("source_used") or
        result.get("source")      or
        "lip_reading"
    )

    is_whisper = (
        "speech"  in source_raw.lower() or
        "whisper" in source_raw.lower()
    )

    if is_whisper:
        print("Whisper fallback triggered")
        log.warning(
            f"Whisper fallback triggered — "
            f"confidence={raw_confidence:.2%}  source='{source_raw}'"
        )
    else:
        log.info(
            f"Lip-reading used — "
            f"confidence={raw_confidence:.2%}  source='{source_raw}'"
        )

    source = "speech_fallback" if is_whisper else "lip_reading"

    raw_top3   = result.get("top3") or []
    top3_items = []
    for item in raw_top3:
        if isinstance(item, (list, tuple)) and len(item) == 2:
            top3_items.append(
                Top3Item(label=str(item[0]), confidence=round(float(item[1]), 4))
            )
        elif isinstance(item, dict):
            lbl  = item.get("label") or item.get("sentence") or ""
            prob = item.get("confidence") or item.get("probability") or 0.0
            top3_items.append(
                Top3Item(label=str(lbl), confidence=round(float(prob), 4))
            )

    viz_urls = []
    for path in (result.get("viz_paths") or []):
        viz_urls.append(f"/viz/{os.path.basename(path)}")

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
# POST-INFERENCE HOUSEKEEPING
# ============================================================

def _post_inference_housekeeping(result: dict) -> None:
    """
    Called after every successful inference.
    1. Seed the 3 permanent dashboard sample images if missing.
    2. Enforce VIZ_MAX_FILES limit, deleting oldest non-sample files.
    """
    viz_paths = result.get("viz_paths") or []
    _seed_sample_images(viz_paths)
    _cleanup_viz_output()


# ============================================================
# ENDPOINTS
# ============================================================

@app.get("/health", response_model=HealthResponse)
def health():
    video_count = len([
        f for f in os.listdir(DEMO_VIDEOS_DIR)
        if os.path.splitext(f)[1].lower() in SUPPORTED_EXTENSIONS
    ]) if os.path.exists(DEMO_VIDEOS_DIR) else 0
    return HealthResponse(
        status        = "ok",
        model_ready   = bool(_resources.get("model")),
        whisper_ready = _resources.get("whisper_model") is not None,
        video_count   = video_count,
    )


@app.get("/videos", response_model=VideoListResponse)
def list_videos():
    if not os.path.exists(DEMO_VIDEOS_DIR):
        return VideoListResponse(videos=[])
    video_files = sorted([
        f for f in os.listdir(DEMO_VIDEOS_DIR)
        if os.path.splitext(f)[1].lower() in SUPPORTED_EXTENSIONS
    ])
    log.info(f"GET /videos → {len(video_files)} videos")
    return VideoListResponse(videos=video_files)


@app.get("/videos/stream/{filename}")
def stream_video(filename: str):
    filename  = os.path.basename(filename)
    orig_path = os.path.join(DEMO_VIDEOS_DIR, filename)

    if not os.path.exists(orig_path):
        raise HTTPException(status_code=404, detail=f"Video '{filename}' not found.")

    if filename.lower().endswith(".mp4"):
        return FileResponse(orig_path, media_type="video/mp4")

    base_name    = os.path.splitext(filename)[0]
    mp4_filename = f"{base_name}_converted.mp4"
    mp4_path     = os.path.join(DEMO_VIDEOS_DIR, mp4_filename)

    if not os.path.exists(mp4_path):
        log.info(f"Converting {filename} → {mp4_filename}...")
        success = _convert_to_mp4(orig_path, mp4_path)
        if not success:
            log.warning("Serving original file without conversion.")
            return FileResponse(orig_path, media_type="video/mpeg")

    return FileResponse(mp4_path, media_type="video/mp4")


# ── POST /predict — GRID demo video ──────────────────────────
@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
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

    if not _resources:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    whisper_model = _resources.get("whisper_model")
    if whisper_model is None:
        log.warning("POST /predict — Whisper not available, fallback disabled.")

    try:
        result = run_silentspeak(
            source_type   = "grid",
            resources     = _resources,
            video_path    = video_path,
            whisper_model = whisper_model,
        )
    except Exception as e:
        log.error(f"Inference failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    # ── Housekeeping: seed samples + enforce size limit ───────
    _post_inference_housekeeping(result)

    response = _normalise_result(result, video_path)
    log.info(
        f"Prediction: '{response.sentence}' "
        f"({response.confidence:.2%}) via {response.source}"
    )
    return response


# ── POST /predict/upload — uploaded file or webcam blob ──────
@app.post("/predict/upload", response_model=PredictResponse)
async def predict_upload(file: UploadFile = File(...)):
    log.info(
        f"POST /predict/upload  "
        f"filename={file.filename}  content_type={file.content_type}"
    )

    if not _resources:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    try:
        video_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read uploaded file: {str(e)}"
        )

    if not video_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    log.info(f"Received {len(video_bytes)} bytes")

    original_name = file.filename or "upload.mp4"
    ext           = os.path.splitext(original_name)[1].lower()

    if not ext or ext not in SUPPORTED_EXTENSIONS:
        ct = (file.content_type or "").lower()
        if   "webm"      in ct: ext = ".webm"
        elif "mp4"       in ct: ext = ".mp4"
        elif "mpeg"      in ct or "mpg" in ct: ext = ".mpg"
        elif "avi"       in ct: ext = ".avi"
        elif "quicktime" in ct or "mov" in ct: ext = ".mov"
        else:                   ext = ".webm"

    safe_filename = f"upload_{uuid.uuid4().hex}{ext}"

    whisper_model = _resources.get("whisper_model")
    if whisper_model is None:
        log.warning("POST /predict/upload — Whisper not available, fallback disabled.")

    try:
        result = run_silentspeak(
            source_type   = "upload",
            resources     = _resources,
            video_bytes   = video_bytes,
            filename      = safe_filename,
            whisper_model = whisper_model,
        )
    except Exception as e:
        log.error(f"Upload inference failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    # ── Housekeeping: seed samples + enforce size limit ───────
    _post_inference_housekeeping(result)

    video_path = result.get("video_path") or safe_filename
    response   = _normalise_result(result, video_path)
    log.info(
        f"Upload prediction: '{response.sentence}' "
        f"({response.confidence:.2%}) via {response.source}"
    )
    return response