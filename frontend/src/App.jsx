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
  const [screen,      setScreen]      = useState(SCREEN.INTRO)
  const [inputType,   setInputType]   = useState(null)
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState(null)
  const [sourceMedia, setSourceMedia] = useState(null)

  // ── Navigation ───────────────────────────────────────────
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

  // ── Inference ────────────────────────────────────────────
  const handlePredict = async (payload) => {
    setScreen(SCREEN.PROCESSING)
    setError(null)

    if (payload.type === 'upload') setSourceMedia({ type: 'file', data: payload.file })
    if (payload.type === 'webcam') setSourceMedia({ type: 'blob', data: payload.blob })
    if (payload.type === 'grid')   setSourceMedia({ type: 'grid', name: payload.videoName })

    try {
      let response

      if (payload.type === 'grid') {
        response = await fetch(`${API}/predict`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ video_name: payload.videoName }),
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
          body:   formData,
          // Do NOT set Content-Type manually — browser sets multipart boundary
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

  // ── Shared page header (SELECT + NOTICE screens) ─────────
  const PageHeader = () => (
    <header
      className="w-full px-6 sm:px-10 py-6 flex items-center justify-between animate-slide-down"
      style={{ borderBottom: '1px solid #374151' }}
    >
      {/* Left — brand + status */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight"
          style={{ color: '#f9fafb' }}>
          Silent<span
            className="glow-accent-text"
            style={{ color: '#3b82f6' }}>Speak</span>
        </h1>
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: '#3b82f60f', border: '1px solid #3b82f620', color: '#3b82f6' }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block"
            style={{ background: '#22c55e' }} />
          SYSTEM ONLINE
        </div>
      </div>

      {/* Right — subtitle */}
      <p className="hidden md:block font-mono text-xs" style={{ color: '#6b7280' }}>
        AI lip-reading · 3D-CNN · GRID Corpus
      </p>
    </header>
  )

  // ── Layout ───────────────────────────────────────────────
  return (
    <div className="min-h-screen grid-bg" style={{ background: '#111827' }}>

      {/* Global scanline */}
      <div className="scanline" />

      {/* Subtle hero radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 35% at 50% 0%, #3b82f608, transparent 65%)',
          zIndex: 0,
        }}
      />

      {/* ── INTRO ── */}
      {screen === SCREEN.INTRO && (
        <IntroPopup onEnter={handleEnter} />
      )}

      {/* ── SELECT ── */}
      {screen === SCREEN.SELECT && (
        <div className="relative z-10 flex flex-col min-h-screen">
          <PageHeader />
          {/* Hero sub-header — left aligned */}
          <div className="w-full px-6 sm:px-10 pt-10 pb-2">
            <div className="max-w-3xl">
              <p className="font-mono text-xs tracking-widest mb-2"
                style={{ color: '#3b82f6' }}>
                INPUT SOURCE
              </p>
              <h2 className="text-3xl sm:text-4xl font-black mb-2"
                style={{ color: '#f9fafb' }}>
                Select Input Mode
              </h2>
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                Choose how to feed video into the lip-reading pipeline.
              </p>
            </div>
          </div>
          <InputSelector onSelect={handleSelect} />
        </div>
      )}

      {/* ── NOTICE ── */}
      {screen === SCREEN.NOTICE && (
        <div className="relative z-10 flex flex-col min-h-screen">
          <PageHeader />
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
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded font-mono text-xs animate-slide-up flex items-center gap-3"
          style={{
            background:  '#1f0a0a',
            border:      '1px solid #ef444440',
            color:       '#f87171',
            whiteSpace:  'nowrap',
            maxWidth:    'calc(100vw - 2rem)',
          }}
        >
          <span>⚠</span>
          <span className="truncate">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-1 opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
          >✕</button>
        </div>
      )}
    </div>
  )
}