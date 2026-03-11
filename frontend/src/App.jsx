import { useState } from 'react'
import IntroPopup from './components/IntroPopup'
import InputSelector from './components/InputSelector'
import ResearchNotice from './components/ResearchNotice'
import VideoPreview from './components/VideoPreview'
import ProcessingScreen from './components/ProcessingScreen'
import ResultPanel from './components/ResultPanel'

const API = 'http://localhost:8000'

// Screens
const SCREEN = {
  INTRO: 'intro',
  SELECT: 'select',
  NOTICE: 'notice',
  PREVIEW: 'preview',
  PROCESSING: 'processing',
  RESULT: 'result',
}

export default function App() {
  const [screen, setScreen] = useState(SCREEN.INTRO)
  const [inputType, setInputType] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Intro → Select
  const handleEnter = () => setScreen(SCREEN.SELECT)

  // Select → Notice (for experimental) or Preview (for grid)
  const handleSelect = (type) => {
    setInputType(type)
    if (type === 'upload' || type === 'webcam') {
      setScreen(SCREEN.NOTICE)
    } else {
      setScreen(SCREEN.PREVIEW)
    }
  }

  // Notice → Preview
  const handleNoticeContinue = () => setScreen(SCREEN.PREVIEW)

  // Notice → Select
  const handleNoticeCancel = () => setScreen(SCREEN.SELECT)

  // Preview → Processing → Result
  const handlePredict = async (payload) => {
    setScreen(SCREEN.PROCESSING)
    setError(null)

    try {
      let response

      if (payload.type === 'grid') {
        response = await fetch(`${API}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_name: payload.videoName }),
        })
      } else {
        // Upload or webcam — send as multipart form
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

  // Reset to start
  const handleReset = () => {
    setScreen(SCREEN.SELECT)
    setResult(null)
    setError(null)
    setInputType(null)
  }

  return (
    <>
      {/* Scanline effect */}
      <div className="scanline" />

      {screen === SCREEN.INTRO && (
        <IntroPopup onEnter={handleEnter} />
      )}

      {screen === SCREEN.SELECT && (
        <>
          <InputSelector onSelect={handleSelect} />
          {error && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded font-mono text-xs animate-fade-in"
              style={{ background: '#1a0a0a', border: '1px solid #f8717150', color: '#f87171' }}>
              ⚠ {error}
            </div>
          )}
        </>
      )}

      {screen === SCREEN.NOTICE && (
        <>
          <InputSelector onSelect={handleSelect} />
          <ResearchNotice
            inputType={inputType}
            onContinue={handleNoticeContinue}
            onCancel={handleNoticeCancel}
          />
        </>
      )}

      {screen === SCREEN.PREVIEW && (
        <>
          <VideoPreview
            inputType={inputType}
            onPredict={handlePredict}
            onBack={() => setScreen(SCREEN.SELECT)}
          />
          {error && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded font-mono text-xs animate-fade-in"
              style={{ background: '#1a0a0a', border: '1px solid #f8717150', color: '#f87171' }}>
              ⚠ {error}
            </div>
          )}
        </>
      )}

      {screen === SCREEN.PROCESSING && (
        <ProcessingScreen />
      )}

      {screen === SCREEN.RESULT && result && (
        <ResultPanel result={result} onReset={handleReset} />
      )}
    </>
  )
}
