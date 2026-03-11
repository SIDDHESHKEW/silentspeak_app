# SilentSpeak — Backend

> AI lip-reading inference server · FastAPI · Developer: **Siddesh Kewate**

---

## Overview

SilentSpeak predicts spoken command phrases by analyzing lip movements in video using a trained 3D-CNN. When lip-reading confidence falls below 70%, a local Whisper speech-recognition fallback activates automatically.

---

## Project Structure

```
backend/
├── app.py                       ← FastAPI server — all endpoints
├── inference.py                 ← Full AI inference pipeline
├── requirements.txt             ← Python dependencies (versioned)
│
├── model/
│   ├── silentspeak_demo.keras   ← Trained 3D-CNN (copy from Drive)
│   └── label_map.npy            ← Label map   (copy from Drive)
│
└── assets/
    ├── demo_videos/             ← Place .mpg GRID videos here
    └── viz_output/              ← Auto-created — detection images
```

---

## System Requirements

| | |
|---|---|
| OS | Windows 10 / 11 (64-bit) |
| Python | **3.11.x (64-bit only)** |
| ffmpeg | System binary — install separately |

> ⚠️ **Python 3.12 is NOT supported.** TensorFlow 2.18 has no 3.12 wheel.
> ⚠️ **32-bit Python is NOT supported.** TensorFlow requires 64-bit.

---

## Confirmed Working Stack

| Package | Version | Note |
|---|---|---|
| Python | 3.11.9 (64-bit) | |
| tensorflow | **2.18.0** | Last version with Windows wheel. Ships Keras 3.x |
| keras | 3.13.2 | Bundled with tensorflow 2.18 |
| torch | **2.2.2+cpu** | Install separately — see Step 3 |
| torchaudio | **2.2.2+cpu** | Install separately — see Step 3 |
| numpy | **2.0.2** | numpy 2.1+ breaks OpenCV on Windows |
| opencv-python-headless | **4.10.0.84** | |
| optree | **0.12.1** | ⚠️ Pinned — 0.13+ causes fatal crash on Windows |
| openai-whisper | latest | Downloads model weights (~140 MB) on first run |
| ffmpeg-python | latest | Python binding — ffmpeg binary also required |
| fastapi | 0.111.0 | |
| uvicorn[standard] | 0.29.0 | |
| python-multipart | 0.0.9 | |
| pydantic | 2.7.1 | |

---

## Installation

### Step 1 — Verify Python version

```powershell
python --version
# Must print: Python 3.11.x
```

If you have 3.12 or a 32-bit build, download Python **3.11.9 (64-bit)**:
https://www.python.org/downloads/release/python-3119/

---

### Step 2 — Create and activate virtual environment

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
```

---

### Step 3 — Install PyTorch first (separate step — required)

```powershell
pip install torch==2.2.2+cpu torchaudio==2.2.2+cpu --index-url https://download.pytorch.org/whl/cpu
```

> PyTorch must be installed before TensorFlow on Windows, from this specific URL.
> Do **not** use `pip install torch` — the default PyPI build will crash with a DLL error.

---

### Step 4 — Install all other dependencies

```powershell
pip install -r requirements.txt
```

---

### Step 5 — Install ffmpeg system binary

ffmpeg must be available as a terminal command for Whisper audio extraction.

**Option A — winget (PowerShell, recommended):**
```powershell
winget install ffmpeg
```
Then **restart your terminal** and verify:
```powershell
ffmpeg -version

```

**Option B — manual:**
1. Download from https://ffmpeg.org/download.html
2. Extract (e.g. to `C:\ffmpeg`)
3. Add `C:\ffmpeg\bin` to your system PATH

---

### Step 6 — Add required environment variables

Add these two lines to the **very top** of both `app.py` and `inference.py`:

```python
import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['KMP_DUPLICATE_LIB_OK']  = 'TRUE'
```

These prevent two different Windows-specific TensorFlow startup crashes.

---

### Step 7 — Copy model files from Google Drive

```
model/silentspeak_demo.keras   ← Drive: silentspeak_project/models/
model/label_map.npy            ← Drive: silentspeak_project/data/tensors/
```

---

### Step 8 — Copy demo videos

```
assets/demo_videos/*.mpg   ← Drive: silentspeak_project/data/grid_data/s1_processed/
```

---

### Step 9 — Start the server

```powershell
uvicorn app:app --reload
```

| | |
|---|---|
| Server | http://127.0.0.1:8000 |
| Swagger UI | http://127.0.0.1:8000/docs |

**Expected startup output:**
```
✅ Model loaded — Input: (None,50,50,100,1)  Output: (None,30)
✅ Label map loaded (30 classes)
✅ Face cascade ready
✅ Mouth cascade ready
✅ full_sentence_map built (30 entries)
INFO: Application startup complete.
```

---

## API Endpoints

### `GET /health`
Returns server status and confirms the model is loaded.

```json
{
  "status":      "ok",
  "model_ready": true,
  "video_count": 30
}
```

---

### `GET /videos`
Lists all `.mpg` / `.mp4` files found in `assets/demo_videos/`.
Used by the frontend to populate the video selector dropdown.

```json
{ "videos": ["lgwg2n.mpg", "lbwg3s.mpg", "..."] }
```

---

### `POST /predict`
Runs the full inference pipeline on a selected demo video.

**Request:**
```json
{ "video_name": "lgwg2n.mpg" }
```

**Response:**
```json
{
  "sentence":    "BIN BLUE AT F TWO NOW",
  "label":       "f_two_now",
  "confidence":  0.9241,
  "source_used": "lip_reading",
  "top3": [
    { "label": "f_two_now",   "probability": 0.9241 },
    { "label": "f_four_now",  "probability": 0.0512 },
    { "label": "s_two_now",   "probability": 0.0198 }
  ],
  "viz_paths":  ["/viz/frame_0_original.jpg", "/viz/frame_0_detect.jpg", "/viz/frame_0_lip.jpg"],
  "video_path": "assets/demo_videos/lgwg2n.mpg"
}
```

**`source_used` values:**
- `lip_reading` — confidence ≥ 70%, model result used directly
- `speech_fallback` — confidence < 70%, local Whisper transcript used as final output

---

### `GET /viz/{image_name}`
Serves a saved detection visualization image as a static file.

```
GET /viz/frame_0_original.jpg   ← original frame
GET /viz/frame_0_detect.jpg     ← face + lip detection overlay
GET /viz/frame_0_lip.jpg        ← cropped lip region (4× upscaled)
```

---

## Inference Pipeline

```
POST /predict
      │
      ▼
video_input_gateway()     resolve video path
      │
      ▼
preprocess_video()        extract frames → detect lips → build tensor (50,50,100,1)
      │
      ▼
predict_command()         3D-CNN → softmax → top-1 + top-3
      │
      ▼
confidence ≥ 0.70?
      │
      ├── YES → BRANCH A — LIP READING
      │           decode_prediction(label_str, full_sentence_map)
      │           → "BIN BLUE AT F TWO NOW"
      │           source_used = "lip_reading"
      │
      └── NO  → BRANCH B — SPEECH FALLBACK
                  extract_audio()        ffmpeg → 16kHz mono WAV
                  transcribe_audio()     local Whisper (no API key)
                  transcript.upper()     → final sentence
                  source_used = "speech_fallback"
                  decode_prediction() NOT called in this branch
```

---

## Model Details

| | |
|---|---|
| Architecture | 3D Convolutional Neural Network |
| Input shape | `(1, 50, 50, 100, 1)` float32 |
| Output | 30 command classes (softmax) |
| Training data | GRID corpus · speaker s1 |
| Train accuracy | ~97% |
| Val accuracy | ~95% |
| Confidence threshold | 0.70 |

**GRID command grammar:**
```
bin blue at {letter} {digit} {adverb}
```
Example commands: `bin blue at f two now` · `bin blue at s one soon` · `bin blue at z four now`

---

## Troubleshooting

### Fatal crash on startup — optree access violation
```
Fatal Python error: access violation
```
```powershell
pip install optree==0.12.1
```

---

### DLL load failed importing torch
```
ImportError: DLL load failed while importing _C
```
```powershell
pip uninstall torch torchaudio -y
pip install torch==2.2.2+cpu torchaudio==2.2.2+cpu --index-url https://download.pytorch.org/whl/cpu
```

---

### Keras / model format error
```
ValueError: File format not supported
```
```powershell
pip install tensorflow==2.18.0
```
tensorflow 2.18 ships Keras 3.x which is required to load the `.keras` model file.

---

### ffmpeg not found
```
FileNotFoundError: [WinError 2] ffmpeg
```
Install ffmpeg and restart your terminal (see Step 5).

---

### numpy / OpenCV conflict
```
AttributeError: module 'numpy' has no attribute 'bool'
```
```powershell
pip install numpy==2.0.2
pip install opencv-python-headless==4.10.0.84
```

---

## Frontend

The React + Vite + TailwindCSS frontend is in `silentspeak-frontend/`.

```powershell
cd silentspeak-frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

Make sure the backend is running at `http://localhost:8000` before starting the frontend.
