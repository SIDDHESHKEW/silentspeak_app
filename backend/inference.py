# ============================================================
# inference.py — SilentSpeak Inference Pipeline
# Ready for FastAPI backend — copy this file into backend/
# ============================================================


import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
import sys
import re
import glob
import shutil
import tempfile
import urllib.request
import subprocess
import warnings
from collections import Counter
from typing import Dict, List, Tuple, Optional, Any

warnings.filterwarnings("ignore")

import numpy as np
import cv2
import tensorflow as tf
import whisper

# ============================================================
# CONSTANTS  (match notebook Cell S3)
# ============================================================

CONFIDENCE_THRESHOLD      = 0.70
FRAME_TARGET              = 50
FRAME_SLICE_START         = 20
FRAME_SLICE_END           = 70
FRAME_HEIGHT              = 50
FRAME_WIDTH               = 100
VISUALIZATION_FRAME_COUNT = 6
VISUALIZATION_SKIP        = 8
WHISPER_MODEL_SIZE        = "base"
SOURCE_LIP                = "lip_reading"
SOURCE_SPEECH             = "speech_fallback"

TEMP_DIR       = "/tmp/silentspeak"
VIZ_OUTPUT_DIR = os.path.join("assets", "viz_output")

CASCADE_FACE_URL  = (
    "https://raw.githubusercontent.com/opencv/opencv/master/"
    "data/haarcascades/haarcascade_frontalface_default.xml"
)
CASCADE_MOUTH_URL = (
    "https://raw.githubusercontent.com/opencv/opencv/master/"
    "data/haarcascades/haarcascade_smile.xml"
)
CASCADE_FACE_PATH  = os.path.join(TEMP_DIR, "haarcascade_frontalface_default.xml")
CASCADE_MOUTH_PATH = os.path.join(TEMP_DIR, "haarcascade_smile.xml")


# ============================================================
# STAGE 1 — load_resources()
# ============================================================

def load_resources(
    model_path     : str = os.path.join("model", "silentspeak_demo.keras"),
    label_map_path : str = os.path.join("model", "label_map.npy"),
    viz_output_dir : str = VIZ_OUTPUT_DIR,
    temp_dir       : str = TEMP_DIR,
) -> Dict[str, Any]:
    """
    Load all static assets for the SilentSpeak inference pipeline.

    Returns dict with keys:
        model, label_map, idx_to_label,
        face_cascade, mouth_cascade, full_sentence_map
    """

    resources = {}
    print("=" * 50)
    print("  SILENTSPEAK — LOADING RESOURCES")
    print("=" * 50)

    os.makedirs(temp_dir,       exist_ok=True)
    os.makedirs(viz_output_dir, exist_ok=True)

    # ── 1. Load trained model ─────────────────────────────────
    print("\n[1/5] Loading model...")
    if not os.path.exists(model_path):
        models_dir = os.path.dirname(model_path)
        contents   = os.listdir(models_dir) if os.path.exists(models_dir) else []
        raise FileNotFoundError(
            f"Model not found at:\n  {model_path}\n"
            f"Files in {models_dir}: {contents}"
        )
    resources['model'] = tf.keras.models.load_model(model_path)
    print(f"  ✅ Model loaded")
    print(f"     Input  : {resources['model'].input_shape}")
    print(f"     Output : {resources['model'].output_shape}")

    # ── 2. Load label map ─────────────────────────────────────
    print("\n[2/5] Loading label map...")
    if not os.path.exists(label_map_path):
        raise FileNotFoundError(
            f"Label map not found at:\n  {label_map_path}"
        )
    label_map    = np.load(label_map_path, allow_pickle=True).item()
    idx_to_label = {v: k for k, v in label_map.items()}
    resources['label_map']    = label_map
    resources['idx_to_label'] = idx_to_label
    print(f"  ✅ Label map loaded  ({len(label_map)} classes)")

    # ── 3. Face cascade ───────────────────────────────────────
    print("\n[3/5] Initializing face detector...")
    if not os.path.exists(CASCADE_FACE_PATH):
        print("  Downloading face cascade...")
        urllib.request.urlretrieve(CASCADE_FACE_URL, CASCADE_FACE_PATH)
    face_cascade = cv2.CascadeClassifier(CASCADE_FACE_PATH)
    if face_cascade.empty():
        raise RuntimeError(f"Failed to load face cascade: {CASCADE_FACE_PATH}")
    resources['face_cascade'] = face_cascade
    print("  ✅ Face cascade ready")

    # ── 4. Mouth cascade ──────────────────────────────────────
    print("\n[4/5] Initializing mouth detector...")
    if not os.path.exists(CASCADE_MOUTH_PATH):
        print("  Downloading mouth cascade...")
        urllib.request.urlretrieve(CASCADE_MOUTH_URL, CASCADE_MOUTH_PATH)
    mouth_cascade = cv2.CascadeClassifier(CASCADE_MOUTH_PATH)
    if mouth_cascade.empty():
        raise RuntimeError(f"Failed to load mouth cascade: {CASCADE_MOUTH_PATH}")
    resources['mouth_cascade'] = mouth_cascade
    print("  ✅ Mouth cascade ready")

    # ── 5. Build full_sentence_map from label_map ─────────────
    print("\n[5/5] Building full_sentence_map...")
    full_sentence_map = {}
    for label_str in label_map:
        parts = label_str.split('_')
        if len(parts) == 3:
            letter, digit, adverb = parts
            full_sentence_map[label_str] = f"bin blue at {letter} {digit} {adverb}"
        else:
            full_sentence_map[label_str] = label_str.replace('_', ' ')
    resources['full_sentence_map'] = full_sentence_map
    print(f"  ✅ full_sentence_map built  ({len(full_sentence_map)} entries)")

    print("\n" + "=" * 50)
    print("  ✅ ALL RESOURCES LOADED SUCCESSFULLY")
    print("=" * 50)
    return resources


# ============================================================
# STAGE 2 — video_input_gateway()
# ============================================================

def video_input_gateway(
    source_type : str,
    **kwargs
) -> str:
    """
    Normalize any video input source into a local file path.

    source_type: 'grid' | 'upload' | 'webcam'

    grid   → video_path (str)
    upload → video_bytes (bytes), filename (str)
    webcam → duration (int), fps (int)

    Returns: str — local video path
    """

    SUPPORTED = ('grid', 'upload', 'webcam')
    if source_type not in SUPPORTED:
        raise ValueError(f"Unknown source_type '{source_type}'. Supported: {SUPPORTED}")

    os.makedirs(TEMP_DIR, exist_ok=True)

    # ── GRID ──────────────────────────────────────────────────
    if source_type == 'grid':
        video_path = kwargs.get('video_path')
        if not video_path:
            raise ValueError("source_type='grid' requires: video_path")
        video_path = str(video_path).strip()
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"GRID video not found:\n  {video_path}")
        print(f"  ✅ GRID video : {os.path.basename(video_path)}")
        return video_path

    # ── UPLOAD ────────────────────────────────────────────────
    if source_type == 'upload':
        video_bytes = kwargs.get('video_bytes')
        filename    = kwargs.get('filename', 'uploaded_video.mp4')
        if video_bytes is None:
            raise ValueError("source_type='upload' requires: video_bytes")
        if not isinstance(video_bytes, (bytes, bytearray)):
            raise TypeError(f"video_bytes must be bytes, got {type(video_bytes).__name__}")
        ext      = os.path.splitext(filename)[1].lower()
        safe_ext = ext if ext in ('.mp4', '.mpg', '.mpeg', '.avi', '.mov') else '.mp4'
        save_path = os.path.join(TEMP_DIR, 'uploaded_video' + safe_ext)
        with open(save_path, 'wb') as f:
            f.write(video_bytes)
        print(f"  ✅ Upload saved : {save_path}  ({os.path.getsize(save_path)/1e6:.2f} MB)")
        return save_path

    # ── WEBCAM ────────────────────────────────────────────────
    if source_type == 'webcam':
        duration  = float(kwargs.get('duration', 3))
        fps       = int(kwargs.get('fps', 20))
        save_path = os.path.join(TEMP_DIR, 'webcam_recording.mp4')
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            raise RuntimeError("Could not open webcam.")
        ret, test_frame = cap.read()
        if not ret:
            cap.release()
            raise RuntimeError("Webcam opened but failed to read first frame.")
        fh, fw    = test_frame.shape[:2]
        fourcc    = cv2.VideoWriter_fourcc(*'mp4v')
        writer    = cv2.VideoWriter(save_path, fourcc, fps, (fw, fh))
        writer.write(test_frame)
        frames_written = 1
        for _ in range(1, int(duration * fps)):
            ret, frame = cap.read()
            if not ret:
                break
            writer.write(frame)
            frames_written += 1
        cap.release()
        writer.release()
        print(f"  ✅ Webcam recording : {frames_written} frames → {save_path}")
        return save_path


# ============================================================
# STAGE 3 — Preprocessing + Visualization
# ============================================================

def detect_mouth_crop(
    frame_bgr    : np.ndarray,
    face_cascade : cv2.CascadeClassifier,
    mouth_cascade: cv2.CascadeClassifier,
    out_h        : int = FRAME_HEIGHT,
    out_w        : int = FRAME_WIDTH,
    pad          : int = 4,
) -> Tuple[np.ndarray, dict]:
    """
    Detect face + mouth and return normalised lip crop tensor.

    Returns: (lip_crop_tensor float32, bbox_info dict)
    """

    H, W  = frame_bgr.shape[:2]
    gray  = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)

    bbox_info = {'face_box': None, 'mouth_box': None, 'detection_mode': None}

    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5,
        minSize=(60, 60), flags=cv2.CASCADE_SCALE_IMAGE
    )

    if len(faces) > 0:
        fx, fy, fw, fh = max(faces, key=lambda r: r[2] * r[3])
        bbox_info['face_box'] = (fx, fy, fw, fh)

        face_lower_y      = fy + fh // 2
        face_lower_h      = fh // 2
        face_lower_region = gray[face_lower_y:face_lower_y + face_lower_h, fx:fx + fw]

        mouths = mouth_cascade.detectMultiScale(
            face_lower_region, scaleFactor=1.05,
            minNeighbors=8, minSize=(25, 15)
        )

        if len(mouths) > 0:
            mx_rel, my_rel, mw, mh = max(mouths, key=lambda r: r[2] * r[3])
            mx  = fx + mx_rel
            my  = face_lower_y + my_rel
            mx1 = max(0, mx - pad);  my1 = max(0, my - pad)
            mx2 = min(W, mx + mw + pad); my2 = min(H, my + mh + pad)
            bbox_info['mouth_box']      = (mx1, my1, mx2 - mx1, my2 - my1)
            bbox_info['detection_mode'] = 'mouth_cascade'
            lip_crop = gray[my1:my2, mx1:mx2]
        else:
            mx1 = max(0, fx);          my1 = max(0, fy + int(fh * 0.65))
            mx2 = min(W, fx + fw);     my2 = min(H, fy + fh)
            bbox_info['mouth_box']      = (mx1, my1, mx2 - mx1, my2 - my1)
            bbox_info['detection_mode'] = 'face_fallback'
            lip_crop = gray[my1:my2, mx1:mx2]
    else:
        mw_fb = int(W * 0.5);  mh_fb = int(H * 0.25)
        mx1   = (W - mw_fb) // 2;  my1 = H - mh_fb - int(H * 0.05)
        mx2   = min(W, mx1 + mw_fb); my2 = min(H, my1 + mh_fb)
        mx1, my1 = max(0, mx1), max(0, my1)
        bbox_info['face_box']       = None
        bbox_info['mouth_box']      = (mx1, my1, mx2 - mx1, my2 - my1)
        bbox_info['detection_mode'] = 'frame_fallback'
        lip_crop = gray[my1:my2, mx1:mx2]

    if lip_crop.size == 0 or lip_crop.shape[0] < 5 or lip_crop.shape[1] < 5:
        lip_crop = gray[H//4:3*H//4, W//4:3*W//4]

    lip_resized     = cv2.resize(lip_crop, (out_w, out_h))
    lip_crop_tensor = lip_resized.astype(np.float32) / 255.0
    return lip_crop_tensor, bbox_info


def save_detection_visualizations(
    frame_bgr  : np.ndarray,
    bbox_info  : dict,
    lip_crop   : np.ndarray,
    frame_idx  : int,
    output_dir : str = VIZ_OUTPUT_DIR,
) -> List[str]:
    """
    Save three diagnostic images for a single frame.

    Returns: [original_path, detect_path, lip_path]
    """

    os.makedirs(output_dir, exist_ok=True)
    saved_paths = []

    # Image 1: original
    orig_path = os.path.join(output_dir, f"frame_{frame_idx}_original.jpg")
    cv2.imwrite(orig_path, frame_bgr)
    saved_paths.append(orig_path)

    # Image 2: annotated
    annotated = frame_bgr.copy()
    if bbox_info.get('face_box') is not None:
        fx, fy, fw, fh = bbox_info['face_box']
        cv2.rectangle(annotated, (fx, fy), (fx+fw, fy+fh), (0, 255, 0), 2)
        cv2.putText(annotated, 'face', (fx, max(0, fy-6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1, cv2.LINE_AA)
    if bbox_info.get('mouth_box') is not None:
        mx, my, mw, mh = bbox_info['mouth_box']
        cv2.rectangle(annotated, (mx, my), (mx+mw, my+mh), (255, 100, 0), 2)
        cv2.putText(annotated, f"lip [{bbox_info.get('detection_mode','')}]",
                    (mx, max(0, my-6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 100, 0), 1, cv2.LINE_AA)
    detect_path = os.path.join(output_dir, f"frame_{frame_idx}_detect.jpg")
    cv2.imwrite(detect_path, annotated)
    saved_paths.append(detect_path)

    # Image 3: lip crop (upscaled 4×)
    lip_uint8   = (lip_crop * 255).astype(np.uint8)
    lip_display = cv2.resize(lip_uint8, (FRAME_WIDTH * 4, FRAME_HEIGHT * 4),
                             interpolation=cv2.INTER_NEAREST)
    lip_path = os.path.join(output_dir, f"frame_{frame_idx}_lip.jpg")
    cv2.imwrite(lip_path, lip_display)
    saved_paths.append(lip_path)

    return saved_paths


def preprocess_video(
    video_path    : str,
    face_cascade  : cv2.CascadeClassifier,
    mouth_cascade : cv2.CascadeClassifier,
    output_dir    : str = VIZ_OUTPUT_DIR,
    frame_start   : int = FRAME_SLICE_START,
    frame_end     : int = FRAME_SLICE_END,
    viz_count     : int = VISUALIZATION_FRAME_COUNT,
    viz_skip      : int = VISUALIZATION_SKIP,
) -> Tuple[np.ndarray, List[np.ndarray], List[str]]:
    """
    Full video preprocessing pipeline.

    Returns: tensor (50,50,100,1), mouth_frames list, viz_paths list
    """

    print(f"  Preprocessing : {os.path.basename(video_path)}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Cannot open video:\n  {video_path}")

    raw_frames = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        raw_frames.append(frame)
    cap.release()

    if len(raw_frames) == 0:
        raise ValueError(f"Video produced 0 frames:\n  {video_path}")

    print(f"  Frames read   : {len(raw_frames)}")

    processed_crops  = []
    mouth_frames_raw = []
    viz_paths        = []
    detection_modes  = []
    viz_saved        = 0

    for i, frame_bgr in enumerate(raw_frames):
        lip_tensor, bbox_info = detect_mouth_crop(frame_bgr, face_cascade, mouth_cascade)
        processed_crops.append(lip_tensor)
        mouth_frames_raw.append((lip_tensor * 255).astype(np.uint8))
        detection_modes.append(bbox_info['detection_mode'])

        if i % viz_skip == 0 and viz_saved < viz_count:
            paths = save_detection_visualizations(
                frame_bgr=frame_bgr, bbox_info=bbox_info,
                lip_crop=lip_tensor, frame_idx=i, output_dir=output_dir
            )
            viz_paths.extend(paths)
            viz_saved += 1

    mode_counts = Counter(detection_modes)
    print(f"  Detection     : {dict(mode_counts)}")

    if len(processed_crops) < frame_end:
        pad_needed        = frame_end - len(processed_crops)
        processed_crops  += [processed_crops[-1]]  * pad_needed
        mouth_frames_raw += [mouth_frames_raw[-1]] * pad_needed
        print(f"  Padded        : +{pad_needed} frames")

    processed_crops  = processed_crops[frame_start:frame_end]
    mouth_frames_raw = mouth_frames_raw[frame_start:frame_end]

    if len(processed_crops) != FRAME_TARGET:
        raise ValueError(f"Expected {FRAME_TARGET} frames, got {len(processed_crops)}")

    tensor = np.stack(processed_crops, axis=0)[..., np.newaxis].astype(np.float32)

    assert tensor.shape == (FRAME_TARGET, FRAME_HEIGHT, FRAME_WIDTH, 1), \
        f"Tensor shape mismatch: {tensor.shape}"

    print(f"  Tensor        : {tensor.shape}  {tensor.dtype}")
    print(f"  Viz saved     : {viz_saved} frames  ({len(viz_paths)} files)")
    return tensor, mouth_frames_raw, viz_paths


# ============================================================
# STAGE 4 — predict_command()
# ============================================================

def predict_command(
    tensor       : np.ndarray,
    model        : tf.keras.Model,
    idx_to_label : dict,
) -> Tuple[str, float, List[Tuple[str, float]]]:
    """
    Run inference on a preprocessed lip tensor.

    Returns: label_str, confidence, top3 [(label, prob), ...]
    """

    expected_shape = (FRAME_TARGET, FRAME_HEIGHT, FRAME_WIDTH, 1)
    if tensor.shape != expected_shape:
        raise ValueError(f"Tensor shape {tensor.shape} != {expected_shape}")
    if tensor.dtype != np.float32:
        raise TypeError(f"Tensor dtype {tensor.dtype} != float32")

    model_input = tensor[np.newaxis, ...]        # (1, 50, 50, 100, 1)
    raw_output  = model.predict(model_input, verbose=0)
    probs       = raw_output[0]                  # shape (30,)

    top1_idx     = int(np.argmax(probs))
    label_str    = idx_to_label[top1_idx]
    confidence   = float(probs[top1_idx])
    top3_indices = np.argsort(probs)[::-1][:3]
    top3         = [(idx_to_label[int(i)], float(probs[i])) for i in top3_indices]

    print(f"  Prediction    : '{label_str}'  ({confidence:.2%})")
    for rank, (lbl, prob) in enumerate(top3, 1):
        print(f"    {rank}. {lbl:<22}  {prob:.2%}")

    return label_str, confidence, top3


# ============================================================
# STAGE 5 — Speech Fallback
# ============================================================

def extract_audio(
    video_path : str,
    output_dir : str = TEMP_DIR,
) -> str:
    """
    Extract audio from video and save as 16kHz mono WAV.

    Returns: audio_path (str)
    """

    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found:\n  {video_path}")

    os.makedirs(output_dir, exist_ok=True)
    audio_path = os.path.join(output_dir, 'extracted_audio.wav')

    if os.path.exists(audio_path):
        os.remove(audio_path)

    command = [
        'ffmpeg', '-y', '-i', video_path,
        '-vn', '-acodec', 'pcm_s16le',
        '-ar', '16000', '-ac', '1',
        audio_path
    ]
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if result.returncode != 0:
        error_msg = result.stderr.decode('utf-8', errors='replace')
        if (not os.path.exists(audio_path) or
                os.path.getsize(audio_path) == 0 or
                'no audio' in error_msg.lower()):
            raise ValueError(
                f"No audio track found in:\n  {video_path}\n"
                "GRID videos are often silent."
            )
        raise RuntimeError(f"ffmpeg error:\n{error_msg}")

    if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
        raise RuntimeError(f"ffmpeg produced empty audio file:\n  {audio_path}")

    print(f"  Audio extracted : {os.path.getsize(audio_path)/1e3:.1f} KB")
    return audio_path


def transcribe_audio(
    audio_path    : str,
    whisper_model,
) -> str:
    """
    Transcribe a WAV file using local Whisper.

    Returns: cleaned lowercase transcript string
    """

    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio not found:\n  {audio_path}")
    if os.path.getsize(audio_path) == 0:
        raise ValueError(f"Audio file is empty:\n  {audio_path}")

    result         = whisper_model.transcribe(audio_path, language='en', fp16=False)
    raw_transcript = result.get('text', '').strip()

    cleaned = raw_transcript.lower()
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
    cleaned = re.sub(r"\s+",          " ", cleaned).strip()

    print(f"  Whisper raw    : '{raw_transcript}'")
    print(f"  Whisper clean  : '{cleaned}'")
    return cleaned


def speech_fallback(
    video_path    : str,
    whisper_model,
    output_dir    : str = TEMP_DIR,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Run Whisper speech recognition.
    Raw transcript becomes the final sentence — no GRID mapping.

    Returns: (transcript, sentence.upper()) or (None, None)
    """

    print("  [Fallback] Extracting audio...")
    try:
        audio_path = extract_audio(video_path=video_path, output_dir=output_dir)
    except ValueError as e:
        print(f"  ⚠️  No audio track: {e}")
        return None, None
    except Exception as e:
        print(f"  ❌ Audio extraction failed: {e}")
        return None, None

    print("  [Fallback] Transcribing...")
    try:
        transcript = transcribe_audio(audio_path=audio_path, whisper_model=whisper_model)
    except Exception as e:
        print(f"  ❌ Transcription failed: {e}")
        return None, None

    if not transcript or not transcript.strip():
        print("  ⚠️  Empty transcript.")
        return None, None

    sentence = transcript.strip().upper()
    print(f"  Whisper transcript : {transcript}")
    print(f"  Final output       : {sentence}")
    return transcript, sentence


# ============================================================
# STAGE 6 — decode_prediction() + run_silentspeak()
# ============================================================

def decode_prediction(
    label_str         : str,
    full_sentence_map : dict,
    uppercase         : bool = True,
) -> str:
    """
    Convert label string → full GRID sentence via full_sentence_map.

    Returns: sentence string (uppercased by default)
    """

    if not full_sentence_map:
        raise ValueError(
            "decode_prediction() requires full_sentence_map.\n"
            "Ensure load_resources() ran successfully."
        )
    if label_str in full_sentence_map:
        sentence = full_sentence_map[label_str]
        return sentence.upper() if uppercase else sentence.lower()

    print(f"  ⚠️  '{label_str}' not in full_sentence_map — using label as fallback.")
    return label_str.upper() if uppercase else label_str


def run_silentspeak(
    source_type : str,
    resources   : dict,
    **kwargs,
) -> dict:
    """
    Run the full SilentSpeak inference pipeline end-to-end.

    Parameters
    ----------
    source_type : str         'grid' | 'upload' | 'webcam'
    resources   : dict        output of load_resources()

    Keyword Arguments
    -----------------
    grid   → video_path    (str)
    upload → video_bytes   (bytes), filename (str)
    webcam → duration      (int),   fps (int)

    Optional:
        output_dir    (str)
        whisper_model (whisper.Whisper)

    Returns
    -------
    dict:
        sentence, label, confidence,
        source_used, top3, viz_paths, video_path
    """

    # ── Unpack resources ──────────────────────────────────────
    model             = resources['model']
    idx_to_label      = resources['idx_to_label']
    face_cascade      = resources['face_cascade']
    mouth_cascade     = resources['mouth_cascade']
    full_sentence_map = resources.get('full_sentence_map', {})
    whisper_model     = kwargs.pop('whisper_model', None)
    output_dir        = kwargs.pop('output_dir', VIZ_OUTPUT_DIR)

    if not full_sentence_map:
        raise ValueError(
            "resources['full_sentence_map'] is missing.\n"
            "Ensure load_resources() completed successfully."
        )

    print("=" * 52)
    print("  SILENTSPEAK — PIPELINE START")
    print(f"  Source : {source_type.upper()}")
    print("=" * 52)

    result = {
        'sentence'    : None,
        'label'       : None,
        'confidence'  : None,
        'source_used' : None,
        'top3'        : [],
        'viz_paths'   : [],
        'video_path'  : None,
    }

    # ── STEP 1: Input Gateway ─────────────────────────────────
    print("\n── STEP 1/5  Input Gateway ─────────────────────────")
    try:
        video_path           = video_input_gateway(source_type=source_type, **kwargs)
        result['video_path'] = video_path
    except Exception as e:
        print(f"  ❌ {e}")
        raise

    # ── STEP 2: Preprocessing ─────────────────────────────────
    print("\n── STEP 2/5  Preprocessing ─────────────────────────")
    try:
        tensor, mouth_frames, viz_paths = preprocess_video(
            video_path    = video_path,
            face_cascade  = face_cascade,
            mouth_cascade = mouth_cascade,
            output_dir    = output_dir,
        )
        result['viz_paths'] = viz_paths
    except Exception as e:
        print(f"  ❌ {e}")
        raise

    # ── STEP 3: Model Inference ───────────────────────────────
    print("\n── STEP 3/5  Model Inference ───────────────────────")
    try:
        label_str, confidence, top3 = predict_command(
            tensor=tensor, model=model, idx_to_label=idx_to_label
        )
        result['confidence'] = confidence
        result['top3']       = top3
    except Exception as e:
        print(f"  ❌ {e}")
        raise

    # ── STEP 4: Confidence Gate ───────────────────────────────
    print("\n── STEP 4/5  Confidence Gate ───────────────────────")
    print(f"  Confidence : {confidence:.2%}  |  Threshold : {CONFIDENCE_THRESHOLD:.0%}")

    # ╔══════════════════════════════╗
    # ║  BRANCH A — LIP READING     ║
    # ╚══════════════════════════════╝
    if confidence >= CONFIDENCE_THRESHOLD:
        print("  ✅ BRANCH A — LIP READING")
        try:
            sentence = decode_prediction(
                label_str=label_str,
                full_sentence_map=full_sentence_map,
                uppercase=True,
            )
        except Exception as e:
            print(f"  ⚠️  decode failed: {e}")
            sentence = label_str.upper()

        result['label']       = label_str
        result['sentence']    = sentence
        result['source_used'] = SOURCE_LIP
        print(f"  Label    : {label_str}")
        print(f"  Sentence : {sentence}")

    # ╔══════════════════════════════════════╗
    # ║  BRANCH B — SPEECH FALLBACK          ║
    # ║  decode_prediction() NOT called here ║
    # ╚══════════════════════════════════════╝
    else:
        print("  ⚠️  BRANCH B — SPEECH FALLBACK")

        if whisper_model is None:
            print("  ⚠️  No whisper_model — using lip result despite low confidence.")
            try:
                sentence = decode_prediction(
                    label_str=label_str,
                    full_sentence_map=full_sentence_map,
                    uppercase=True,
                )
            except Exception:
                sentence = label_str.upper()
            result['label']       = label_str
            result['sentence']    = sentence
            result['source_used'] = SOURCE_LIP

        else:
            try:
                transcript, fallback_sentence = speech_fallback(
                    video_path=video_path,
                    whisper_model=whisper_model,
                    output_dir=output_dir,
                )
            except Exception as e:
                print(f"  ❌ speech_fallback() error: {e}")
                transcript, fallback_sentence = None, None

            if fallback_sentence is not None:
                result['label']       = None
                result['sentence']    = fallback_sentence
                result['source_used'] = SOURCE_SPEECH
                print(f"  Whisper transcript : {transcript}")
                print(f"  Final output       : {fallback_sentence}")
            else:
                print("  ↳ Fallback returned None — using lip result.")
                try:
                    sentence = decode_prediction(
                        label_str=label_str,
                        full_sentence_map=full_sentence_map,
                        uppercase=True,
                    )
                except Exception:
                    sentence = label_str.upper()
                result['label']       = label_str
                result['sentence']    = sentence
                result['source_used'] = SOURCE_LIP

    # ── STEP 5: Final Summary ─────────────────────────────────
    print("\n── STEP 5/5  Result ────────────────────────────────")
    print("=" * 52)
    print(f"  ➤  {result['sentence']}")
    print(f"     source     : {result['source_used']}")
    print(f"     confidence : {result['confidence']:.2%}")
    print(f"     label      : {result['label'] or 'None (speech branch)'}")
    print("=" * 52)

    return result

