import { useState, useEffect, useRef } from 'react'

const API = 'http://localhost:8000'

export default function VideoPreview({ inputType, onPredict, onBack }) {
  const [videos, setVideos] = useState([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const timerRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    if (inputType === 'grid') {
      fetch(`${API}/videos`)
        .then(r => r.json())
        .then(data => setVideos(data.videos || []))
        .catch(console.error)
    }
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      clearInterval(timerRef.current)
    }
  }, [inputType])

  const handlePredict = () => {
    if (inputType === 'grid' && selected) onPredict({ type: 'grid', videoName: selected })
    else if (inputType === 'upload' && uploadedFile) onPredict({ type: 'upload', file: uploadedFile })
    else if (inputType === 'webcam' && recordedBlob) onPredict({ type: 'webcam', blob: recordedBlob })
  }

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) {
      alert('Cannot access camera: ' + err.message)
    }
  }

  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    const mr = new MediaRecorder(streamRef.current)
    mediaRecorderRef.current = mr
    mr.ondataavailable = e => chunksRef.current.push(e.data)
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      setRecordedBlob(blob)
      if (videoRef.current) videoRef.current.src = URL.createObjectURL(blob)
    }
    mr.start()
    setRecording(true)
    setRecordingTime(0)
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    clearInterval(timerRef.current)
    setRecording(false)
  }

  const canPredict = (inputType === 'grid' && selected) ||
    (inputType === 'upload' && uploadedFile) ||
    (inputType === 'webcam' && recordedBlob)

  return (
    <div className="min-h-screen grid-bg flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between" style={{ borderBottom: '1px solid #1a2530' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 font-mono text-xs transition-colors duration-200 hover:opacity-100 opacity-50"
            style={{ color: '#22d3ee' }}
          >
            ← BACK
          </button>
          <div className="w-px h-4" style={{ background: '#1a2530' }} />
          <span className="font-black text-xl tracking-tight" style={{ color: '#e8f4f8' }}>
            Silent<span style={{ color: '#22d3ee' }}>Speak</span>
          </span>
        </div>
        <div className="font-mono text-xs px-3 py-1 rounded" style={{ color: '#22d3ee', background: '#22d3ee15', border: '1px solid #22d3ee30' }}>
          {inputType.toUpperCase()}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-xs tracking-widest" style={{ color: '#22d3ee' }}>CONFIGURE</span>
            <div className="h-px flex-1" style={{ background: '#1a2530' }} />
          </div>

          <h2 className="text-4xl font-black mb-8" style={{ color: '#e8f4f8' }}>
            {inputType === 'grid' ? 'Select Demo Video' : inputType === 'upload' ? 'Upload Video' : 'Record Webcam'}
          </h2>

          {/* GRID VIDEO */}
          {inputType === 'grid' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="block font-mono text-xs mb-2" style={{ color: '#3a5060' }}>VIDEO FILE</label>
                <select
                  value={selected}
                  onChange={e => setSelected(e.target.value)}
                  className="w-full p-3 font-mono text-sm rounded outline-none"
                  style={{ background: '#080d12', border: '1px solid #1a2530', color: '#e8f4f8' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#22d3ee40'}
                  onBlur={e => e.currentTarget.style.borderColor = '#1a2530'}
                >
                  <option value="">— Select a video —</option>
                  {videos.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              {selected && (
                <div className="animate-slide-up" style={{ border: '1px solid #1a2530', borderRadius: '2px', overflow: 'hidden' }}>
                  <div className="px-4 py-2 font-mono text-xs" style={{ background: '#040608', color: '#3a5060', borderBottom: '1px solid #1a2530' }}>
                    PREVIEW — {selected}
                  </div>
                  <video
                    key={selected}
                    src={`${API}/videos/${selected}`}
                    controls
                    className="w-full"
                    style={{ maxHeight: '300px', background: '#000' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* UPLOAD */}
          {inputType === 'upload' && (
            <div className="animate-fade-in">
              <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
                onChange={e => { const f = e.target.files[0]; if (f) setUploadedFile(f) }} />

              {!uploadedFile ? (
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="w-full p-12 rounded border-2 border-dashed flex flex-col items-center gap-4 transition-all duration-200"
                  style={{ borderColor: '#1a2530', background: '#080d12' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#22d3ee40'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1a2530'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5" className="w-10 h-10 opacity-50">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <div className="text-center">
                    <div className="font-semibold mb-1" style={{ color: '#e8f4f8' }}>Drop video or click to browse</div>
                    <div className="font-mono text-xs" style={{ color: '#3a5060' }}>MP4, MOV, AVI, MPG supported</div>
                  </div>
                </button>
              ) : (
                <div className="animate-slide-up">
                  <div style={{ border: '1px solid #1a2530', borderRadius: '2px', overflow: 'hidden' }}>
                    <div className="px-4 py-2 font-mono text-xs flex items-center justify-between" style={{ background: '#040608', color: '#3a5060', borderBottom: '1px solid #1a2530' }}>
                      <span>{uploadedFile.name}</span>
                      <button onClick={() => setUploadedFile(null)} style={{ color: '#f87171' }}>✕</button>
                    </div>
                    <video src={URL.createObjectURL(uploadedFile)} controls className="w-full" style={{ maxHeight: '300px', background: '#000' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WEBCAM */}
          {inputType === 'webcam' && (
            <div className="space-y-4 animate-fade-in">
              <div style={{ border: '1px solid #1a2530', borderRadius: '2px', overflow: 'hidden' }}>
                <div className="px-4 py-2 font-mono text-xs flex items-center gap-2" style={{ background: '#040608', color: '#3a5060', borderBottom: '1px solid #1a2530' }}>
                  {recording && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#f87171', display: 'inline-block' }} />}
                  {recording ? `RECORDING — ${recordingTime}s` : recordedBlob ? 'RECORDED' : 'CAMERA PREVIEW'}
                </div>
                <video ref={videoRef} autoPlay muted={recording} playsInline className="w-full" style={{ maxHeight: '300px', background: '#000' }} />
              </div>

              <div className="flex gap-3">
                {!streamRef.current && !recordedBlob && (
                  <button onClick={startWebcam} className="flex-1 py-3 font-bold text-sm rounded transition-all"
                    style={{ background: '#22d3ee15', border: '1px solid #22d3ee40', color: '#22d3ee' }}>
                    Start Camera
                  </button>
                )}
                {streamRef.current && !recording && !recordedBlob && (
                  <button onClick={startRecording} className="flex-1 py-3 font-bold text-sm rounded transition-all"
                    style={{ background: '#f8717115', border: '1px solid #f8717140', color: '#f87171' }}>
                    ⏺ Record
                  </button>
                )}
                {recording && (
                  <button onClick={stopRecording} className="flex-1 py-3 font-bold text-sm rounded transition-all"
                    style={{ background: '#f8717115', border: '1px solid #f8717140', color: '#f87171' }}>
                    ⏹ Stop Recording
                  </button>
                )}
                {recordedBlob && (
                  <button onClick={() => { setRecordedBlob(null); setRecordingTime(0); startWebcam() }}
                    className="flex-1 py-3 font-bold text-sm rounded transition-all"
                    style={{ background: '#1a2530', border: '1px solid #3a5060', color: '#6b8a9a' }}>
                    Re-record
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Predict button */}
          <button
            onClick={handlePredict}
            disabled={!canPredict}
            className="w-full mt-8 py-4 font-black text-sm tracking-widest uppercase rounded transition-all duration-300"
            style={{
              background: canPredict ? 'linear-gradient(135deg, #22d3ee20, #22d3ee35)' : '#0c1218',
              border: `1px solid ${canPredict ? '#22d3ee50' : '#1a2530'}`,
              color: canPredict ? '#22d3ee' : '#3a5060',
              cursor: canPredict ? 'pointer' : 'not-allowed',
              boxShadow: canPredict ? '0 0 30px #22d3ee15' : 'none',
            }}
          >
            {canPredict ? 'Start Prediction →' : 'Select a video to continue'}
          </button>
        </div>
      </main>
    </div>
  )
}
