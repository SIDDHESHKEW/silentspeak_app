# SilentSpeak

> AI Lip-Reading System · 3D-CNN · FastAPI · React  
> Developer: **Siddesh Kewate**

---

## What is SilentSpeak?

SilentSpeak is an AI application that predicts spoken command phrases by analyzing lip movements in video — no audio required. It uses a trained 3D Convolutional Neural Network on the GRID corpus and achieves ~97% training accuracy across 30 command classes.

When the model's confidence falls below 70%, a local Whisper speech-recognition fallback activates automatically — fully offline, no API key needed.

---

## Demo

The application works with GRID corpus videos (speaker s1). You select a demo video, the system processes the lip movements, and returns the predicted spoken command with confidence score and visualization frames.

**Example output:**
```
Predicted:   BIN BLUE AT F TWO NOW
Confidence:  92.4%
Source:      lip_reading
```

---

## Project Structure

```
silentspeak/
│
├── backend/                     ← FastAPI inference server
│   ├── app.py                   ← API endpoints
│   ├── inference.py             ← Full AI pipeline
│   ├── requirements.txt         ← Python dependencies (versioned)
│   ├── model/
│   │   ├── silentspeak_demo.keras   ← Trained 3D-CNN model
│   │   └── label_map.npy            ← Label map
│   └── assets/
│       ├── demo_videos/         ← .mpg GRID demo videos
│       └── viz_output/          ← Detection visualization images
│
└── silentspeak-frontend/        ← React + Vite + TailwindCSS UI
    ├── src/
    │   ├── App.jsx
    │   └── components/
    │       ├── IntroPopup.jsx
    │       ├── InputSelector.jsx
    │       ├── ResearchNotice.jsx
    │       ├── VideoPreview.jsx
    │       ├── ProcessingScreen.jsx
    │       └── ResultPanel.jsx
    ├── package.json
    └── vite.config.js
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI Model | 3D-CNN (TensorFlow / Keras 3.x) |
| Face & Lip Detection | OpenCV Haar Cascades |
| Speech Fallback | OpenAI Whisper (local, offline) |
| Audio Extraction | ffmpeg |
| Backend API | FastAPI + Uvicorn |
| Frontend | React 18 + Vite + TailwindCSS |

---

## AI Pipeline

```
Video Input
      │
      ▼
preprocess_video()
  Extract frames → Haar cascade face + lip detection
  → Crop lip region → Build tensor (50, 50, 100, 1)
      │
      ▼
predict_command()
  3D-CNN inference → softmax → top-3 predictions
      │
      ▼
confidence ≥ 70%?
      │
      ├── YES → decode_prediction()
      │           label → full GRID sentence
      │           source = "lip_reading"
      │
      └── NO  → speech_fallback()
                  ffmpeg audio extract
                  local Whisper transcription
                  raw transcript as final output
                  source = "speech_fallback"
```

---

## Model Details

| Property | Value |
|---|---|
| Architecture | 3D Convolutional Neural Network |
| Input tensor | `(1, 50, 50, 100, 1)` float32 |
| Output | 30 command classes (softmax) |
| Training data | GRID corpus · speaker s1 |
| Train accuracy | ~97% |
| Val accuracy | ~95% |
| Confidence threshold | 0.70 |

**GRID command grammar:**
```
bin blue at {letter} {digit} {adverb}
```

---

## System Requirements

| Requirement | Version |
|---|---|
| OS | Windows 10 / 11 (64-bit) |
| Python | **3.11.x (64-bit only)** |
| Node.js | 18+ |
| ffmpeg | System binary |

> ⚠️ Python 3.12 is NOT supported — TensorFlow 2.18 has no 3.12 wheel.

---

## Confirmed Python Stack

| Package | Version |
|---|---|
| tensorflow | 2.18.0 |
| keras | 3.13.2 |
| torch | 2.2.2+cpu |
| torchaudio | 2.2.2+cpu |
| numpy | 2.0.2 |
| opencv-python-headless | 4.10.0.84 |
| optree | 0.12.1 ⚠️ pinned |
| openai-whisper | latest |
| fastapi | 0.111.0 |
| uvicorn[standard] | 0.29.0 |
| pydantic | 2.7.1 |

---

## Quick Start

### 1. Clone / set up the project

```powershell
cd silentspeak
```

### 2. Install ffmpeg

```powershell
winget install ffmpeg
# Restart terminal after install
ffmpeg -version   # verify
```

### 3. Set up the backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate

# Install PyTorch FIRST (special URL — do not skip)
pip install torch==2.2.2+cpu torchaudio==2.2.2+cpu --index-url https://download.pytorch.org/whl/cpu

# Install everything else
pip install -r requirements.txt
```

### 4. Add Windows environment variables

Add to the **top** of both `app.py` and `inference.py`:

```python
import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['KMP_DUPLICATE_LIB_OK']  = 'TRUE'
```

### 5. Copy model files from Google Drive

```
backend/model/silentspeak_demo.keras   ← silentspeak_project/models/
backend/model/label_map.npy            ← silentspeak_project/data/tensors/
```

### 6. Copy demo videos

```
backend/assets/demo_videos/*.mpg   ← silentspeak_project/data/grid_data/s1_processed/
```

### 7. Start the backend

```powershell
# From backend/ with venv active
uvicorn app:app --reload
# Running at http://127.0.0.1:8000
# Swagger UI at http://127.0.0.1:8000/docs
```

### 8. Start the frontend

```powershell
# New terminal
cd silentspeak-frontend
npm install
npm run dev
# Running at http://localhost:5173
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Server + model status |
| GET | `/videos` | List available demo videos |
| POST | `/predict` | Run inference on a video |
| GET | `/viz/{img}` | Serve detection visualization |

**POST /predict — request:**
```json
{ "video_name": "lgwg2n.mpg" }
```

**POST /predict — response:**
```json
{
  "sentence":    "BIN BLUE AT F TWO NOW",
  "label":       "f_two_now",
  "confidence":  0.9241,
  "source_used": "lip_reading",
  "top3": [
    { "label": "f_two_now",  "probability": 0.9241 },
    { "label": "f_four_now", "probability": 0.0512 },
    { "label": "s_two_now",  "probability": 0.0198 }
  ],
  "viz_paths":  ["/viz/frame_0_original.jpg", "..."],
  "video_path": "assets/demo_videos/lgwg2n.mpg"
}
```

---

## UI Flow

```
Intro Screen
    │
    ▼
Input Selector
  ├── Demo GRID Video  (recommended)
  ├── Upload Video     (experimental — shows GRID constraint warning)
  └── Live Webcam      (experimental — shows GRID constraint warning)
    │
    ▼
Video Preview + "Start Prediction"
    │
    ▼
Processing Screen
  Extracting frames → Detecting landmarks → Isolating lips
  → Running 3D-CNN → Evaluating confidence
    │
    ▼
Result Panel
  Predicted sentence · Confidence bar · Top-3 · Visualization frames
  Source badge: LIP READING or SPEECH FALLBACK
```

---

## Troubleshooting

| Error | Fix |
|---|---|
| Fatal access violation on startup | `pip install optree==0.12.1` |
| `DLL load failed` importing torch | Reinstall torch from `download.pytorch.org/whl/cpu` |
| `File format not supported` (Keras) | `pip install tensorflow==2.18.0` |
| `ffmpeg not found` | Install ffmpeg + restart terminal |
| numpy / OpenCV conflict | `pip install numpy==2.0.2 opencv-python-headless==4.10.0.84` |

---

## Important Constraints

- The model was trained **only on GRID corpus speaker s1** — it recognizes the 30 specific commands from that dataset.
- Upload and webcam modes are experimental. For best results, speak GRID commands clearly and ensure good lighting and a frontal face angle.
- GRID commands follow a fixed grammar: `bin blue at {letter} {digit} {adverb}`

---

## Detailed Documentation

- Backend setup, all endpoints, full troubleshooting → `backend/README.md`