# SilentSpeak Backend

## Folder structure

```
backend/
├── app.py                  ← FastAPI server (all endpoints)
├── inference.py            ← AI pipeline interface
├── requirements.txt        ← Python dependencies
│
├── model/
│   ├── silentspeak_demo.keras   ← trained model (copy from Drive)
│   └── label_map.npy            ← label map (copy from Drive)
│
└── assets/
    ├── demo_videos/         ← place your .mpg demo files here
    └── viz_output/          ← auto-created, stores detection images
```

## Setup

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Install ffmpeg system package (required by Whisper)
#    Ubuntu/Debian:
sudo apt install ffmpeg
#    macOS:
brew install ffmpeg
#    Windows: download from https://ffmpeg.org/download.html

# 4. Copy model files from Google Drive
cp /path/to/silentspeak_demo.keras  model/
cp /path/to/label_map.npy           model/

# 5. Copy demo videos
cp /path/to/grid_videos/*.mpg  assets/demo_videos/

# 6. Paste notebook pipeline into inference.py
#    See comments inside inference.py for exact paste locations.

# 7. Start the server
uvicorn app:app --reload
```

## Endpoints

| Method | Path       | Description                        |
|--------|------------|------------------------------------|
| GET    | /health    | Server + model status check        |
| GET    | /videos    | List all available demo videos     |
| POST   | /predict   | Run inference on a selected video  |
| GET    | /viz/{img} | Serve saved detection viz images   |

## POST /predict — example

Request:
```json
{ "video_name": "lgwg2n.mpg" }
```

Response:
```json
{
  "sentence"    : "BIN BLUE AT F TWO NOW",
  "label"       : "f_two_now",
  "confidence"  : 0.92,
  "source_used" : "lip_reading",
  "top3"        : [
    { "label": "f_two_now",  "probability": 0.92 },
    { "label": "f_four_now", "probability": 0.05 },
    { "label": "s_two_now",  "probability": 0.02 }
  ],
  "viz_paths"   : ["/viz/frame_0_original.jpg", "..."],
  "video_path"  : "assets/demo_videos/lgwg2n.mpg"
}
```
