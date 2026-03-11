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

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("silentspeak")

# ── Paths ─────────────────────────────────────────────────────
MODEL_PATH      = os.path.join("model", "silentspeak_demo.keras")
LABEL_MAP_PATH  = os.path.join("model", "label_map.npy")
DEMO_VIDEOS_DIR = os.path.join("assets", "demo_videos")
VIZ_OUTPUT_DIR  = os.path.join("assets", "viz_output")
UPLOAD_TEMP_DIR = os.path.join("assets", "uploads_temp")

SUPPORTED_EXTENSIONS = {".mpg", ".mp4", ".avi", ".mpeg", ".mov", ".webm"}
NEEDS_CONVERSION     = {".webm", ".mpeg"}

# ── viz_output config ─────────────────────────────────────────
VIZ_MAX_FILES    = 60
VIZ_SAMPLE_FILES = {"sample_original.jpg", "sample_detect.jpg", "sample_lip.jpg"}

# ── Global state ──────────────────────────────────────────────
_resources: dict = {}


# ============================================================
# VIZ HELPERS
# ============================================================

def _seed_sample_images(viz_paths: List[str]) -> None:
    targets = {
        "original": os.path.join(VIZ_OUTPUT_DIR, "sample_original.jpg"),
        "detect":   os.path.join(VIZ_OUTPUT_DIR, "sample_detect.jpg"),
        "lip":      os.path.join(VIZ_OUTPUT_DIR, "sample_lip.jpg"),
    }
    if all(os.path.exists(p) for p in targets.values()):
        return
    found = {}
    for path in viz_paths:
        fname = os.path.basename(path)
        for key in ("original", "detect", "lip"):
            if key not in found and f"_{key}." in fname:
                found[key] = path
    for key, dest in targets.items():
        if os.path.exists(dest):
            continue
        src = found.get(key)
        if src and os.path.exists(src):
            try:
                shutil.copy2(src, dest)
                log.info(f"Seeded dashboard sample: {dest}")
            except Exception as e:
                log.warning(f"Could not seed {dest}: {e}")


def _cleanup_viz_output() -> None:
    if not os.path.exists(VIZ_OUTPUT_DIR):
        return
    all_files = [
        os.path.join(VIZ_OUTPUT_DIR, f)
        for f in os.listdir(VIZ_OUTPUT_DIR)
        if f.lower().endswith(".jpg")
        and f not in VIZ_SAMPLE_FILES
        and os.path.isfile(os.path.join(VIZ_OUTPUT_DIR, f))
    ]
    overflow = len(all_files) - VIZ_MAX_FILES
    if overflow <= 0:
        return
    all_files.sort(key=lambda p: os.path.getmtime(p))
    deleted = 0
    for path in all_files[:overflow]:
        try:
            os.remove(path)
            deleted += 1
        except Exception as e:
            log.warning(f"Could not delete {path}: {e}")
    log.info(f"viz_output cleanup: removed {deleted}, limit={VIZ_MAX_FILES}")


def _post_inference_housekeeping(result: dict) -> None:
    _seed_sample_images(result.get("viz_paths") or [])
    _cleanup_viz_output()


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
    _resources.update(load_resources(
        model_path=MODEL_PATH, label_map_path=LABEL_MAP_PATH, viz_output_dir=VIZ_OUTPUT_DIR
    ))
    log.info("TF model loaded.")

    log.info("Loading Whisper model (base)...")
    try:
        _resources["whisper_model"] = whisper.load_model("base")
        log.info("Whisper model loaded successfully.")
    except Exception as e:
        log.error(f"Whisper failed to load: {e}")
        log.warning("Whisper unavailable — lip reading only.")
        _resources["whisper_model"] = None

    log.info("Server is ready.")
    log.info("=" * 52)
    yield
    log.info("SilentSpeak backend shutting down.")
    _resources.clear()


# ── App ───────────────────────────────────────────────────────
app = FastAPI(title="SilentSpeak API", version="1.0.0", lifespan=lifespan)

app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000","http://localhost:5173",
                   "http://127.0.0.1:3000","http://127.0.0.1:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

app.mount("/viz",    StaticFiles(directory=VIZ_OUTPUT_DIR), name="viz")
app.mount("/assets", StaticFiles(directory="assets"),       name="assets")


# ============================================================
# HELPERS
# ============================================================

def _ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def _convert_to_mp4(input_path: str, output_path: str) -> bool:
    """Standard MP4 conversion for stream serving."""
    if not _ffmpeg_available():
        log.warning("ffmpeg not found.")
        return False
    try:
        r = subprocess.run(
            ["ffmpeg", "-y", "-i", input_path,
             "-c:v", "libx264", "-preset", "fast", "-crf", "23",
             "-c:a", "aac", "-movflags", "+faststart", output_path],
            capture_output=True, timeout=120,
        )
        if r.returncode != 0:
            log.error(f"ffmpeg error: {r.stderr.decode()}")
            return False
        return True
    except Exception as e:
        log.error(f"ffmpeg exception: {e}")
        return False

def _convert_webcam_to_mp4(input_path: str, output_path: str) -> bool:
    """
    High-quality conversion for webcam .webm recordings.
    loudnorm: normalizes audio to -14 LUFS so Whisper can hear quiet mics.
    crf=18, 16kHz mono audio optimal for Whisper, map 0 copies all streams.
    """
    if not _ffmpeg_available():
        log.warning("ffmpeg not found.")
        return False
    try:
        r = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", input_path,
                "-map", "0",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "18",
                "-vf", "scale=-2:'max(480,ih)'",
                "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,volume=5dB",
                "-c:a", "aac",
                "-ar", "16000",
                "-ac", "1",
                "-movflags", "+faststart",
                output_path,
            ],
            capture_output=True, timeout=120,
        )
        if r.returncode != 0:
            log.error(f"ffmpeg webcam conversion error: {r.stderr.decode()}")
            return False
        return True
    except Exception as e:
        log.error(f"ffmpeg webcam conversion exception: {e}")
        return False
# ```

# **What changed — one line added:**
# ```
# "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,volume=5dB",


def _ensure_mp4_bytes(raw_bytes: bytes, ext: str, label: str) -> tuple:
    """Convert webm/mpeg → H.264 MP4 preserving audio for Whisper."""
    if ext not in NEEDS_CONVERSION or not _ffmpeg_available():
        return raw_bytes, ext

    tmp_dir  = os.path.join(UPLOAD_TEMP_DIR, "conv")
    os.makedirs(tmp_dir, exist_ok=True)
    src_path = os.path.join(tmp_dir, f"{label}_src{ext}")
    dst_path = os.path.join(tmp_dir, f"{label}_dst.mp4")

    try:
        with open(src_path, "wb") as f:
            f.write(raw_bytes)
        log.info(f"Converting {ext} → .mp4 (high quality, audio preserved)...")
        success = _convert_webcam_to_mp4(src_path, dst_path)
        if success and os.path.exists(dst_path) and os.path.getsize(dst_path) > 0:
            with open(dst_path, "rb") as f:
                mp4_bytes = f.read()
            log.info(f"Conversion OK: {len(raw_bytes)}B ({ext}) → {len(mp4_bytes)}B (.mp4)")
            return mp4_bytes, ".mp4"
        log.warning("Conversion failed — using original bytes.")
        return raw_bytes, ext
    except Exception as e:
        log.error(f"_ensure_mp4_bytes error: {e}")
        return raw_bytes, ext
    finally:
        for p in (src_path, dst_path):
            try:
                if os.path.exists(p): os.remove(p)
            except Exception:
                pass


def _cleanup_temp(path: str):
    try:
        if path and os.path.exists(path): os.remove(path)
    except Exception:
        pass


def _whisper_transcribe(file_path: str, whisper_model) -> Optional[str]:
    """
    Run Whisper transcribe() on a file path.
    All filters disabled — Whisper supreme, always attempts transcription.
    Returns text if speech detected, None if silent/failed.
    """
    if whisper_model is None:
        return None
    try:
        log.info(f"Whisper transcribing: {file_path}")
        result = whisper_model.transcribe(
            file_path,
            language                   = "en",
            fp16                       = False,
            condition_on_previous_text = False,
            no_speech_threshold        = 0.1,
            logprob_threshold          = None,
            compression_ratio_threshold= None,
            verbose                    = False,
        )
        text = result.get("text", "").strip()
        log.info(f"Whisper transcript: '{text}'")
        return text if text else None
    except Exception as e:
        log.error(f"Whisper transcription failed: {e}")
        return None


def _whisper_from_bytes(video_bytes: bytes, ext: str, whisper_model) -> Optional[str]:
    """Write bytes to temp file, run Whisper, clean up."""
    if whisper_model is None:
        return None
    tmp_path = os.path.join(UPLOAD_TEMP_DIR, f"w_{uuid.uuid4().hex[:8]}{ext}")
    try:
        with open(tmp_path, "wb") as f:
            f.write(video_bytes)
        return _whisper_transcribe(tmp_path, whisper_model)
    finally:
        _cleanup_temp(tmp_path)


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
# RESULT BUILDER
# ============================================================

def _build_response(
    result        : dict,
    video_path    : str,
    whisper_text  : Optional[str],
) -> PredictResponse:
    """
    Whisper supreme rule:
      - If Whisper returned text → use it, source = speech_fallback
      - If Whisper returned nothing → use lip model sentence, source = lip_reading
    No confidence thresholds. No gates.
    """
    lip_sentence   = result.get("sentence") or result.get("predicted_sentence") or ""
    lip_confidence = round(float(result.get("confidence") or 0.0), 4)
    lip_label      = result.get("label")

    if whisper_text:
        sentence = whisper_text
        source   = "speech_fallback"
        log.info(f"FINAL: Whisper wins → '{sentence}'")
    else:
        sentence = lip_sentence
        source   = "lip_reading"
        log.info(f"FINAL: Whisper silent → lip model wins → '{sentence}'")

    raw_top3   = result.get("top3") or []
    top3_items = []
    for item in raw_top3:
        if isinstance(item, (list, tuple)) and len(item) == 2:
            top3_items.append(Top3Item(label=str(item[0]), confidence=round(float(item[1]), 4)))
        elif isinstance(item, dict):
            lbl  = item.get("label") or item.get("sentence") or ""
            prob = item.get("confidence") or item.get("probability") or 0.0
            top3_items.append(Top3Item(label=str(lbl), confidence=round(float(prob), 4)))

    viz_urls = [f"/viz/{os.path.basename(p)}" for p in (result.get("viz_paths") or [])]

    return PredictResponse(
        sentence   = sentence,
        label      = lip_label,
        confidence = lip_confidence,
        source     = source,
        top3       = top3_items,
        viz_paths  = viz_urls,
        video_path = video_path,
    )


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
    base_name = os.path.splitext(filename)[0]
    mp4_path  = os.path.join(DEMO_VIDEOS_DIR, f"{base_name}_converted.mp4")
    if not os.path.exists(mp4_path):
        log.info(f"Converting {filename} → mp4...")
        if not _convert_to_mp4(orig_path, mp4_path):
            log.warning("Serving original.")
            return FileResponse(orig_path, media_type="video/mpeg")
    return FileResponse(mp4_path, media_type="video/mp4")


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    """GRID demo video — Whisper runs on the video file directly."""
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

    # Run lip model (inference.py handles its own internal logic)
    try:
        result = run_silentspeak(
            source_type          = "grid",
            resources            = _resources,
            video_path           = video_path,
            whisper_model        = whisper_model,
            confidence_threshold = 1.01,  # force inference.py to always use lip model only
        )
    except Exception as e:
        log.error(f"Inference failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    # Whisper supreme — run directly on the video file
    whisper_text = _whisper_transcribe(video_path, whisper_model)

    _post_inference_housekeeping(result)
    response = _build_response(result, video_path, whisper_text)
    log.info(f"GRID prediction: '{response.sentence}' via {response.source}")
    return response


@app.post("/predict/upload", response_model=PredictResponse)
async def predict_upload(file: UploadFile = File(...)):
    """Upload / webcam — Whisper runs on the converted MP4 bytes."""
    log.info(f"POST /predict/upload  filename={file.filename}  content_type={file.content_type}")
    if not _resources:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    try:
        video_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")

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

    label            = uuid.uuid4().hex[:8]
    video_bytes, ext = _ensure_mp4_bytes(video_bytes, ext, label)
    safe_filename    = f"upload_{uuid.uuid4().hex}{ext}"

    whisper_model = _resources.get("whisper_model")

    # Run lip model for viz frames + top3 (ignore its sentence)
    try:
        result = run_silentspeak(
            source_type          = "upload",
            resources            = _resources,
            video_bytes          = video_bytes,
            filename             = safe_filename,
            whisper_model        = whisper_model,
            confidence_threshold = 1.01,  # force inference.py to lip model only
        )
    except Exception as e:
        log.error(f"Upload inference failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    # Whisper supreme — run directly on the converted MP4 bytes
    whisper_text = _whisper_from_bytes(video_bytes, ext, whisper_model)

    _post_inference_housekeeping(result)
    video_path = result.get("video_path") or safe_filename
    response   = _build_response(result, video_path, whisper_text)
    log.info(f"Upload prediction: '{response.sentence}' via {response.source}")
    return response