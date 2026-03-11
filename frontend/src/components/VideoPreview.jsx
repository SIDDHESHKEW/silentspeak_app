import { useState, useEffect, useRef } from 'react'

const API = 'http://localhost:8000'

// Pick best supported MIME type for MediaRecorder
function getSupportedMimeType() {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  return types.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

export default function VideoPreview({ inputType, onPredict, onBack }) {
  const [videos,        setVideos]        = useState([])
  const [selected,      setSelected]      = useState('')
  const [uploadedFile,  setUploadedFile]  = useState(null)
  const [uploadProgress,setUploadProgress]= useState(0)
  const [recordedBlob,  setRecordedBlob]  = useState(null)
  const [recording,     setRecording]     = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [cameraReady,   setCameraReady]   = useState(false)

  const fileInputRef      = useRef(null)
  const videoRef          = useRef(null)
  const mediaRecorderRef  = useRef(null)
  const timerRef          = useRef(null)
  const streamRef         = useRef(null)
  const chunksRef         = useRef([])

  // ── Fetch GRID video list ──────────────────────────────
  useEffect(() => {
    if (inputType === 'grid') {
      fetch(`${API}/videos`)
        .then(r => r.json())
        .then(data => setVideos(data.videos || []))
        .catch(console.error)
    }
    return () => {
      stopStream()
      clearInterval(timerRef.current)
    }
  }, [inputType])

  // ── Reload video element when GRID selection changes ───
  useEffect(() => {
    if (inputType === 'grid' && selected && videoRef.current) {
      videoRef.current.load()
    }
  }, [selected, inputType])

  // ── Helpers ────────────────────────────────────────────
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const startWebcam = async () => {
    try {
      stopStream()
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
      }
      setCameraReady(true)
      setRecordedBlob(null)
    } catch (err) {
      alert('Cannot access camera: ' + err.message)
    }
  }

  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []

    const mimeType = getSupportedMimeType()
    const options  = mimeType ? { mimeType } : {}
    const mr       = new MediaRecorder(streamRef.current, options)
    mediaRecorderRef.current = mr

    mr.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' })
      setRecordedBlob(blob)
      stopStream()
      setCameraReady(false)
      if (videoRef.current) {
        videoRef.current.srcObject = null
        videoRef.current.src = URL.createObjectURL(blob)
        videoRef.current.muted = false
        videoRef.current.load()
      }
    }

    mr.start(200) // collect chunks every 200ms for reliability
    setRecording(true)
    setRecordingTime(0)
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    clearInterval(timerRef.current)
    setRecording(false)
  }

  const handleReRecord = () => {
    setRecordedBlob(null)
    setRecordingTime(0)
    startWebcam()
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setUploadedFile(f)
    setUploadProgress(0)
    // Simulate progress for UX feedback
    let p = 0
    const iv = setInterval(() => {
      p += 20
      setUploadProgress(p)
      if (p >= 100) clearInterval(iv)
    }, 80)
  }

  const handlePredict = () => {
    if (inputType === 'grid'   && selected)      onPredict({ type: 'grid',   videoName: selected })
    if (inputType === 'upload' && uploadedFile)  onPredict({ type: 'upload', file: uploadedFile })
    if (inputType === 'webcam' && recordedBlob)  onPredict({ type: 'webcam', blob: recordedBlob })
  }

  const canPredict =
    (inputType === 'grid'   && selected)     ||
    (inputType === 'upload' && uploadedFile) ||
    (inputType === 'webcam' && recordedBlob)

  const modeLabel = {
    grid:   'DEMO VIDEO',
    upload: 'UPLOAD',
    webcam: 'WEBCAM',
  }[inputType] || ''

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen grid-bg flex flex-col">

      {/* Header */}
      <header className="px-6 sm:px-8 py-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid #1e2d3d' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="font-mono text-xs transition-all duration-200 opacity-50 hover:opacity-100"
            style={{ color: '#00d4ff' }}
          >
            ← BACK
          </button>
          <div className="w-px h-4" style={{ background: '#1e2d3d' }} />
          <span className="font-black text-xl tracking-tight" style={{ color: '#e6f1ff' }}>
            Silent<span style={{ color: '#00d4ff' }}>Speak</span>
          </span>
        </div>
        <div className="font-mono text-xs px-3 py-1 rounded"
          style={{ color: '#00d4ff', background: '#00d4ff12', border: '1px solid #00d4ff30' }}>
          {modeLabel}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-2xl">

          {/* Section label */}
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-xs tracking-widest" style={{ color: '#00d4ff' }}>
              CONFIGURE
            </span>
            <div className="h-px flex-1" style={{ background: '#1e2d3d' }} />
          </div>

          <h2 className="text-3xl sm:text-4xl font-black mb-8" style={{ color: '#e6f1ff' }}>
            {inputType === 'grid'   ? 'Select Demo Video' :
             inputType === 'upload' ? 'Upload Video'      : 'Record Webcam'}
          </h2>

          {/* ── GRID ── */}
          {inputType === 'grid' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="block font-mono text-xs mb-2" style={{ color: '#4a5568' }}>
                  VIDEO FILE
                </label>
                <select
                  value={selected}
                  onChange={e => setSelected(e.target.value)}
                  className="w-full p-3 font-mono text-sm rounded outline-none transition-all duration-200"
                  style={{ background: '#0d1421', border: '1px solid #1e2d3d', color: '#e6f1ff' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#00d4ff40'}
                  onBlur={e  => e.currentTarget.style.borderColor = '#1e2d3d'}
                >
                  <option value="">— Select a video —</option>
                  {videos.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              {selected && (
                <div className="animate-slide-up"
                  style={{ border: '1px solid #1e2d3d', borderRadius: '4px', overflow: 'hidden' }}>
                  <div className="px-4 py-2 font-mono text-xs flex items-center gap-2"
                    style={{ background: '#0b0f17', color: '#4a5568', borderBottom: '1px solid #1e2d3d' }}>
                    <span style={{ color: '#00d4ff' }}>▶</span> PREVIEW — {selected}
                  </div>
                  {/* Key forces remount on selection change — fixes video not playing */}
                  <video
                    key={selected}
                    ref={videoRef}
                    controls
                    className="w-full"
                    style={{ maxHeight: '320px', background: '#000', display: 'block' }}
                  >
                    {/* Use /assets/demo_videos/ — matches FastAPI StaticFiles mount */}
                    <source src={`${API}/assets/demo_videos/${selected}`} />
                    Your browser does not support video playback.
                  </video>
                </div>
              )}
            </div>
          )}

          {/* ── UPLOAD ── */}
          {inputType === 'upload' && (
            <div className="animate-fade-in">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {!uploadedFile ? (
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="w-full p-12 rounded border-2 border-dashed flex flex-col items-center gap-4 transition-all duration-200"
                  style={{ borderColor: '#1e2d3d', background: '#0d1421' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#00d4ff40'
                    e.currentTarget.style.background  = '#0d1421'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#1e2d3d'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.5"
                    className="w-10 h-10 opacity-50">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <div className="text-center">
                    <div className="font-semibold mb-1" style={{ color: '#e6f1ff' }}>
                      Drop video or click to browse
                    </div>
                    <div className="font-mono text-xs" style={{ color: '#4a5568' }}>
                      MP4, MOV, AVI, MPG supported
                    </div>
                  </div>
                </button>
              ) : (
                <div className="animate-slide-up space-y-3">
                  <div style={{ border: '1px solid #1e2d3d', borderRadius: '4px', overflow: 'hidden' }}>
                    <div className="px-4 py-2 font-mono text-xs flex items-center justify-between"
                      style={{ background: '#0b0f17', color: '#4a5568', borderBottom: '1px solid #1e2d3d' }}>
                      <span className="truncate max-w-xs">{uploadedFile.name}</span>
                      <button
                        onClick={() => { setUploadedFile(null); setUploadProgress(0) }}
                        className="ml-3 transition-colors hover:opacity-100 opacity-60"
                        style={{ color: '#ef4444' }}
                      >
                        ✕
                      </button>
                    </div>
                    <video
                      src={URL.createObjectURL(uploadedFile)}
                      controls
                      className="w-full"
                      style={{ maxHeight: '320px', background: '#000', display: 'block' }}
                    />
                  </div>

                  {/* Upload progress bar */}
                  {uploadProgress < 100 && (
                    <div>
                      <div className="font-mono text-xs mb-1" style={{ color: '#4a5568' }}>
                        LOADING — {uploadProgress}%
                      </div>
                      <div className="confidence-bar-track h-1">
                        <div className="confidence-bar-fill" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── WEBCAM ── */}
          {inputType === 'webcam' && (
            <div className="space-y-4 animate-fade-in">
              <div style={{ border: '1px solid #1e2d3d', borderRadius: '4px', overflow: 'hidden' }}>
                {/* Status bar */}
                <div className="px-4 py-2 font-mono text-xs flex items-center gap-2"
                  style={{ background: '#0b0f17', color: '#4a5568', borderBottom: '1px solid #1e2d3d' }}>
                  {recording && (
                    <span className="w-2 h-2 rounded-full animate-pulse inline-block"
                      style={{ background: '#ef4444' }} />
                  )}
                  <span>
                    {recording    ? `RECORDING — ${recordingTime}s` :
                     recordedBlob ? 'RECORDED — Ready to predict'   :
                     cameraReady  ? 'CAMERA READY'                  : 'CAMERA PREVIEW'}
                  </span>
                </div>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted={!recordedBlob}
                  className="w-full"
                  style={{ maxHeight: '320px', background: '#000', display: 'block' }}
                />
              </div>

              {/* Webcam controls */}
              <div className="flex gap-3 flex-wrap">
                {!cameraReady && !recordedBlob && (
                  <button onClick={startWebcam}
                    className="flex-1 py-3 font-bold text-sm rounded transition-all duration-200"
                    style={{ background: '#00d4ff12', border: '1px solid #00d4ff40', color: '#00d4ff' }}>
                    Start Camera
                  </button>
                )}
                {cameraReady && !recording && (
                  <button onClick={startRecording}
                    className="flex-1 py-3 font-bold text-sm rounded transition-all duration-200"
                    style={{ background: '#ef444412', border: '1px solid #ef444440', color: '#ef4444' }}>
                    ⏺ Record
                  </button>
                )}
                {recording && (
                  <button onClick={stopRecording}
                    className="flex-1 py-3 font-bold text-sm rounded transition-all duration-200 animate-pulse-glow"
                    style={{ background: '#ef444420', border: '1px solid #ef444460', color: '#ef4444' }}>
                    ⏹ Stop — {recordingTime}s
                  </button>
                )}
                {recordedBlob && (
                  <button onClick={handleReRecord}
                    className="flex-1 py-3 font-bold text-sm rounded transition-all duration-200"
                    style={{ background: '#1e2d3d', border: '1px solid #4a5568', color: '#8892a4' }}>
                    ↺ Re-record
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Predict button ── */}
          <button
            onClick={handlePredict}
            disabled={!canPredict}
            className="w-full mt-8 py-4 font-black text-sm tracking-widest uppercase rounded transition-all duration-300"
            style={{
              background: canPredict
                ? 'linear-gradient(135deg, #00d4ff20, #00d4ff38)'
                : '#0d1421',
              border:  `1px solid ${canPredict ? '#00d4ff50' : '#1e2d3d'}`,
              color:   canPredict ? '#00d4ff' : '#4a5568',
              cursor:  canPredict ? 'pointer' : 'not-allowed',
              boxShadow: canPredict ? '0 0 28px #00d4ff15' : 'none',
            }}
            onMouseEnter={e => {
              if (canPredict) e.currentTarget.style.boxShadow = '0 0 40px #00d4ff25'
            }}
            onMouseLeave={e => {
              if (canPredict) e.currentTarget.style.boxShadow = '0 0 28px #00d4ff15'
            }}
          >
            {canPredict ? 'Start Prediction →' : 'Select a video to continue'}
          </button>

        </div>
      </main>
    </div>
  )
}