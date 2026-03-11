import { useState } from 'react'
import IntroPopup from './components/IntroPopup'
import InputSelector from './components/InputSelector'
import ResearchNotice from './components/ResearchNotice'
import VideoPreview from './components/VideoPreview'
import ProcessingScreen from './components/ProcessingScreen'
import ResultPanel from './components/ResultPanel'

const API = 'http://localhost:8000'

const SCREEN = {
  INTRO:      'intro',
  SELECT:     'select',
  NOTICE:     'notice',
  PREVIEW:    'preview',
  PROCESSING: 'processing',
  RESULT:     'result',
}

export default function App() {
  const [screen,    setScreen]    = useState(SCREEN.INTRO)
  const [inputType, setInputType] = useState(null)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState(null)
  // Keep source media so ResultPanel can replay original input
  const [sourceMedia, setSourceMedia] = useState(null)

  // ── Navigation handlers ──────────────────────────────────
  const handleEnter = () => setScreen(SCREEN.SELECT)

  const handleSelect = (type) => {
    setInputType(type)
    setError(null)
    if (type === 'upload' || type === 'webcam') {
      setScreen(SCREEN.NOTICE)
    } else {
      setScreen(SCREEN.PREVIEW)
    }
  }

  const handleNoticeContinue = () => setScreen(SCREEN.PREVIEW)
  const handleNoticeCancel   = () => setScreen(SCREEN.SELECT)

  const handleReset = () => {
    setScreen(SCREEN.SELECT)
    setResult(null)
    setError(null)
    setInputType(null)
    setSourceMedia(null)
  }

  // ── Inference call ───────────────────────────────────────
  const handlePredict = async (payload) => {
    setScreen(SCREEN.PROCESSING)
    setError(null)

    // Store source media for ResultPanel playback
    if (payload.type === 'upload')  setSourceMedia({ type: 'file', data: payload.file })
    if (payload.type === 'webcam')  setSourceMedia({ type: 'blob', data: payload.blob })
    if (payload.type === 'grid')    setSourceMedia({ type: 'grid', name: payload.videoName })

    try {
      let response

      if (payload.type === 'grid') {
        response = await fetch(`${API}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_name: payload.videoName }),
        })
      } else {
        const formData = new FormData()
        if (payload.type === 'upload') {
          formData.append('file', payload.file)
        } else {
          formData.append('file', payload.blob, 'webcam.webm')
        }
        response = await fetch(`${API}/predict/upload`, {
          method: 'POST',
          body: formData,
        })
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Server error: ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
      setScreen(SCREEN.RESULT)
    } catch (err) {
      setError(err.message)
      setScreen(SCREEN.PREVIEW)
    }
  }

  // ── Layout ───────────────────────────────────────────────
  return (
    <div className="min-h-screen grid-bg" style={{ background: '#0b0f17' }}>

      {/* Global scanline */}
      <div className="scanline" />

      {/* Hero radial glow — always present, subtle */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 40% at 50% 0%, #00d4ff08, transparent 70%)',
          zIndex: 0,
        }}
      />

      {/* ── INTRO ── */}
      {screen === SCREEN.INTRO && (
        <IntroPopup onEnter={handleEnter} />
      )}

      {/* ── SELECT ── */}
      {screen === SCREEN.SELECT && (
        <div className="relative z-10">
          {/* Hero header */}
          <header className="pt-12 pb-6 px-4 text-center animate-slide-down">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full font-mono text-xs"
              style={{ background: '#00d4ff0f', border: '1px solid #00d4ff25', color: '#00d4ff' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block"
                style={{ background: '#00d4ff' }} />
              SYSTEM ONLINE
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-2"
              style={{ color: '#e6f1ff' }}>
              Silent<span className="glow-cyan-text" style={{ color: '#00d4ff' }}>Speak</span>
            </h1>
            <p className="text-sm font-mono max-w-md mx-auto" style={{ color: '#8892a4' }}>
              AI lip-reading · 3D-CNN · GRID Corpus · Whisper fallback
            </p>
          </header>

          <InputSelector onSelect={handleSelect} />
        </div>
      )}

      {/* ── NOTICE (Research popup over SELECT) ── */}
      {screen === SCREEN.NOTICE && (
        <div className="relative z-10">
          <header className="pt-12 pb-6 px-4 text-center">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-2"
              style={{ color: '#e6f1ff' }}>
              Silent<span className="glow-cyan-text" style={{ color: '#00d4ff' }}>Speak</span>
            </h1>
          </header>
          <InputSelector onSelect={handleSelect} />
          <ResearchNotice
            inputType={inputType}
            onContinue={handleNoticeContinue}
            onCancel={handleNoticeCancel}
          />
        </div>
      )}

      {/* ── PREVIEW ── */}
      {screen === SCREEN.PREVIEW && (
        <div className="relative z-10">
          <VideoPreview
            inputType={inputType}
            onPredict={handlePredict}
            onBack={() => setScreen(SCREEN.SELECT)}
          />
        </div>
      )}

      {/* ── PROCESSING ── */}
      {screen === SCREEN.PROCESSING && (
        <div className="relative z-10">
          <ProcessingScreen />
        </div>
      )}

      {/* ── RESULT ── */}
      {screen === SCREEN.RESULT && result && (
        <div className="relative z-10">
          <ResultPanel
            result={result}
            sourceMedia={sourceMedia}
            onReset={handleReset}
            API={API}
          />
        </div>
      )}

      {/* ── Global error toast ── */}
      {error && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded font-mono text-xs animate-slide-up flex items-center gap-2"
          style={{
            background: '#1a0808',
            border: '1px solid #ef444450',
            color: '#f87171',
            whiteSpace: 'nowrap',
          }}
        >
          <span>⚠</span>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-3 opacity-60 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}