import { useMemo } from 'react'

const FRAME_GROUPS = [
  { key: 'original', label: 'Original Frame'        },
  { key: 'detect',   label: 'Face + Lip Detection'  },
  { key: 'lip',      label: 'Lip Crop'              },
]

function getConfidenceColor(pct) {
  if (pct >= 80) return '#00d4ff'
  if (pct >= 60) return '#a3e635'
  if (pct >= 40) return '#f59e0b'
  return '#ef4444'
}

// ── Visualization Gallery ──────────────────────────────────
function VisualizationGallery({ vizPaths, API }) {
  if (!vizPaths || vizPaths.length === 0) return (
    <div className="p-6 rounded text-center"
      style={{ background: '#0d1421', border: '1px solid #1e2d3d' }}>
      <p className="font-mono text-xs" style={{ color: '#4a5568' }}>
        No visualization frames available for this prediction.
      </p>
    </div>
  )

  return (
    <div className="space-y-6">
      {FRAME_GROUPS.map(({ key, label }) => {
        const frames = vizPaths.filter(p => p.includes(key))
        if (!frames.length) return null

        return (
          <div key={key}>
            <div className="font-mono text-xs mb-3 flex items-center gap-2"
              style={{ color: '#4a5568' }}>
              <span style={{ color: '#00d4ff' }}>◈</span> {label}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {frames.map((path, i) => (
                <div key={i}
                  style={{ border: '1px solid #1e2d3d', borderRadius: '4px', overflow: 'hidden' }}>
                  <img
                    src={`${API}${path}`}
                    alt={`${label} ${i + 1}`}
                    className="w-full object-cover"
                    style={{ display: 'block', aspectRatio: '1 / 1', background: '#0b0f17' }}
                    onError={e => { e.currentTarget.parentElement.style.display = 'none' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Source video player ────────────────────────────────────
function SourceVideoPlayer({ sourceMedia, API }) {
  const src = useMemo(() => {
    if (!sourceMedia) return null
    if (sourceMedia.type === 'file') return URL.createObjectURL(sourceMedia.data)
    if (sourceMedia.type === 'blob') return URL.createObjectURL(sourceMedia.data)
    if (sourceMedia.type === 'grid') return `${API}/assets/demo_videos/${sourceMedia.name}`
    return null
  }, [sourceMedia, API])

  if (!src) return null

  return (
    <div className="mb-6 animate-slide-up"
      style={{ border: '1px solid #1e2d3d', borderRadius: '4px', overflow: 'hidden',
               animationDelay: '0.1s', animationFillMode: 'forwards', opacity: 0 }}>
      <div className="px-4 py-2 font-mono text-xs flex items-center gap-2"
        style={{ background: '#0b0f17', color: '#4a5568', borderBottom: '1px solid #1e2d3d' }}>
        <span style={{ color: '#00d4ff' }}>▶</span> INPUT VIDEO
      </div>
      <video
        src={src}
        controls
        className="w-full"
        style={{ maxHeight: '280px', background: '#000', display: 'block' }}
      />
    </div>
  )
}

// ── Main ResultPanel ───────────────────────────────────────
export default function ResultPanel({ result, sourceMedia, onReset, API = 'http://localhost:8000' }) {
  const isLipReading   = result.source === 'lip_reading'
  const confidencePct  = Math.round((result.confidence || 0) * 100)
  const confColor      = getConfidenceColor(confidencePct)
  const sentence       = result.sentence || result.predicted_sentence || '—'

  return (
    <div className="min-h-screen grid-bg flex flex-col">

      {/* Header */}
      <header className="px-6 sm:px-8 py-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid #1e2d3d' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: '#00d4ff' }} />
          <span className="font-black text-xl tracking-tight" style={{ color: '#e6f1ff' }}>
            Silent<span style={{ color: '#00d4ff' }}>Speak</span>
          </span>
        </div>
        <button
          onClick={onReset}
          className="font-mono text-xs px-4 py-2 rounded transition-all duration-200"
          style={{ color: '#00d4ff', border: '1px solid #00d4ff30', background: '#00d4ff0c' }}
          onMouseEnter={e => {
            e.currentTarget.style.background  = '#00d4ff18'
            e.currentTarget.style.borderColor = '#00d4ff50'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background  = '#00d4ff0c'
            e.currentTarget.style.borderColor = '#00d4ff30'
          }}
        >
          ← NEW PREDICTION
        </button>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-10 max-w-3xl mx-auto w-full">

        {/* Section label */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <span className="font-mono text-xs tracking-widest" style={{ color: '#00d4ff' }}>
            RESULT
          </span>
          <div className="h-px flex-1" style={{ background: '#1e2d3d' }} />
          <span className="font-mono text-xs" style={{ color: '#4a5568' }}>
            ANALYSIS COMPLETE
          </span>
        </div>

        {/* Input video replay */}
        <SourceVideoPlayer sourceMedia={sourceMedia} API={API} />

        {/* Main result card */}
        <div
          className="mb-6 animate-slide-up"
          style={{
            background:   'linear-gradient(135deg, #0d1421, #111827)',
            border:       '1px solid #1e2d3d',
            borderRadius: '4px',
            overflow:     'hidden',
            animationFillMode: 'forwards',
            opacity: 0,
          }}
        >
          {/* Top accent bar */}
          <div className="h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)' }} />

          <div className="p-6 sm:p-8">

            {/* Source badge */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs ${
                  isLipReading ? 'badge-lip' : 'badge-speech'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full"
                  style={{ background: isLipReading ? '#00d4ff' : '#f59e0b' }} />
                {isLipReading ? 'LIP READING' : 'SPEECH FALLBACK'}
              </div>
              <span className="font-mono text-xs" style={{ color: '#4a5568' }}>
                {isLipReading
                  ? 'High confidence — primary model used'
                  : 'Low confidence — Whisper fallback activated'}
              </span>
            </div>

            {/* Predicted sentence */}
            <div className="mb-8">
              <div className="font-mono text-xs mb-3" style={{ color: '#4a5568' }}>
                PREDICTED COMMAND
              </div>
              <div
                className="prediction-text text-2xl sm:text-3xl font-black tracking-tight glow-cyan-text"
                style={{ color: '#00d4ff', lineHeight: 1.3 }}
              >
                {sentence}
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Confidence */}
              <div className="p-4 rounded"
                style={{ background: '#0b0f17', border: '1px solid #1e2d3d' }}>
                <div className="font-mono text-xs mb-3" style={{ color: '#4a5568' }}>
                  CONFIDENCE
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-3xl font-black font-mono"
                    style={{ color: confColor }}>
                    {confidencePct}%
                  </span>
                  <span className="font-mono text-xs mb-1" style={{ color: '#4a5568' }}>
                    {confidencePct >= 70 ? 'above threshold' : 'below threshold'}
                  </span>
                </div>
                <div className="confidence-bar-track h-2">
                  <div
                    className="confidence-bar-fill"
                    style={{
                      width:      `${confidencePct}%`,
                      background: `linear-gradient(90deg, ${confColor}99, ${confColor})`,
                      boxShadow:  `0 0 10px ${confColor}60`,
                    }}
                  />
                </div>
              </div>

              {/* Top-3 predictions */}
              <div className="p-4 rounded"
                style={{ background: '#0b0f17', border: '1px solid #1e2d3d' }}>
                <div className="font-mono text-xs mb-3" style={{ color: '#4a5568' }}>
                  TOP PREDICTIONS
                </div>
                <div className="space-y-2">
                  {(result.top3 || []).slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-mono text-xs w-4" style={{ color: '#4a5568' }}>
                        {i + 1}.
                      </span>
                      <span className="font-mono text-xs flex-1 truncate prediction-text"
                        style={{ color: i === 0 ? '#e6f1ff' : '#8892a4' }}>
                        {item.label}
                      </span>
                      <span className="font-mono text-xs"
                        style={{ color: i === 0 ? confColor : '#4a5568' }}>
                        {Math.round(item.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                  {(!result.top3 || result.top3.length === 0) && (
                    <p className="font-mono text-xs" style={{ color: '#4a5568' }}>
                      No top-3 data available.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visualization gallery */}
        <div className="animate-slide-up mb-8"
          style={{ animationDelay: '0.25s', animationFillMode: 'forwards', opacity: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-xs tracking-widest" style={{ color: '#00d4ff' }}>
              VISUALIZATION
            </span>
            <div className="h-px flex-1" style={{ background: '#1e2d3d' }} />
          </div>
          <VisualizationGallery vizPaths={result.viz_paths} API={API} />
        </div>

        {/* New prediction CTA */}
        <button
          onClick={onReset}
          className="w-full py-4 font-black text-sm tracking-widest uppercase rounded transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #00d4ff18, #00d4ff28)',
            border:     '1px solid #00d4ff40',
            color:      '#00d4ff',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow  = '0 0 28px #00d4ff20'
            e.currentTarget.style.background = 'linear-gradient(135deg, #00d4ff25, #00d4ff38)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow  = 'none'
            e.currentTarget.style.background = 'linear-gradient(135deg, #00d4ff18, #00d4ff28)'
          }}
        >
          ← Run Another Prediction
        </button>

      </main>
    </div>
  )
}