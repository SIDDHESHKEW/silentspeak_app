function getConfidenceColor(pct) {
  if (pct >= 80) return '#3b82f6'
  if (pct >= 60) return '#22c55e'
  if (pct >= 40) return '#f59e0b'
  return '#ef4444'
}

const FRAME_GROUPS = [
  { key: 'original', label: 'Original Frame'       },
  { key: 'detect',   label: 'Face + Lip Detection' },
  { key: 'lip',      label: 'Lip Crop'             },
]

function VisualizationGallery({ vizPaths, API }) {
  if (!vizPaths || vizPaths.length === 0) return (
    <div className="p-6 rounded-lg text-center"
      style={{ background: '#1f2937', border: '1px solid #374151' }}>
      <p className="font-mono text-xs" style={{ color: '#6b7280' }}>
        No visualization frames available.
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
              style={{ color: '#6b7280' }}>
              <span style={{ color: '#3b82f6' }}>◈</span> {label}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {frames.map((path, i) => (
                <div key={i} className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid #374151' }}>
                  <img
                    src={`${API}${path}`}
                    alt={`${label} ${i + 1}`}
                    className="w-full object-cover"
                    style={{ display: 'block', aspectRatio: '1/1', background: '#111827' }}
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

export default function ResultPanel({ result, sourceMedia, onReset, API = 'http://localhost:8000' }) {
  const confidencePct = Math.round((result.confidence || 0) * 100)
  const confColor     = getConfidenceColor(confidencePct)
  const sentence      = result.sentence || result.predicted_sentence || '—'

  return (
    <div className="min-h-screen grid-bg flex flex-col">

      {/* Header */}
      <header className="px-6 sm:px-8 py-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid #374151' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
          <span className="font-black text-xl tracking-tight" style={{ color: '#f9fafb' }}>
            Silent<span style={{ color: '#3b82f6' }}>Speak</span>
          </span>
        </div>
        <button
          onClick={onReset}
          className="font-mono text-xs px-4 py-2 rounded-lg transition-all duration-200"
          style={{ color: '#3b82f6', border: '1px solid #3b82f628', background: '#3b82f60c' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#3b82f618'; e.currentTarget.style.borderColor = '#3b82f640' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#3b82f60c'; e.currentTarget.style.borderColor = '#3b82f628' }}
        >← NEW PREDICTION</button>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-10 max-w-3xl mx-auto w-full">

        {/* Label */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <span className="font-mono text-xs tracking-widest" style={{ color: '#3b82f6' }}>RESULT</span>
          <div className="h-px flex-1" style={{ background: '#374151' }} />
          <span className="font-mono text-xs" style={{ color: '#6b7280' }}>ANALYSIS COMPLETE</span>
        </div>

        {/* Main result card */}
        <div className="mb-6 animate-slide-up rounded-lg overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1f2937, #111827)',
            border: '1px solid #374151',
            animationFillMode: 'forwards',
            opacity: 0,
          }}>
          <div className="h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)' }} />

          <div className="p-6 sm:p-8">

            {/* Prediction */}
            <div className="mb-8">
              <div className="font-mono text-xs mb-3" style={{ color: '#6b7280' }}>
                PREDICTED COMMAND
              </div>
              <div className="prediction-text text-2xl sm:text-3xl font-black tracking-tight glow-accent-text"
                style={{ color: '#3b82f6', lineHeight: 1.3 }}>
                {sentence}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Confidence */}
              <div className="p-4 rounded-lg"
                style={{ background: '#111827', border: '1px solid #374151' }}>
                <div className="font-mono text-xs mb-3" style={{ color: '#6b7280' }}>CONFIDENCE</div>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-3xl font-black font-mono" style={{ color: confColor }}>
                    {confidencePct}%
                  </span>
                </div>
                <div className="confidence-bar-track h-2">
                  <div className="confidence-bar-fill"
                    style={{
                      width:      `${confidencePct}%`,
                      background: `linear-gradient(90deg, ${confColor}90, ${confColor})`,
                      boxShadow:  `0 0 8px ${confColor}50`,
                    }} />
                </div>
              </div>

              {/* Top-3 */}
              <div className="p-4 rounded-lg"
                style={{ background: '#111827', border: '1px solid #374151' }}>
                <div className="font-mono text-xs mb-3" style={{ color: '#6b7280' }}>
                  TOP PREDICTIONS
                </div>
                <div className="space-y-2">
                  {(result.top3 || []).slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-mono text-xs w-4" style={{ color: '#6b7280' }}>{i + 1}.</span>
                      <span className="font-mono text-xs flex-1 truncate prediction-text"
                        style={{ color: i === 0 ? '#f9fafb' : '#9ca3af' }}>
                        {item.label}
                      </span>
                      <span className="font-mono text-xs"
                        style={{ color: i === 0 ? confColor : '#6b7280' }}>
                        {Math.round(item.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                  {(!result.top3 || result.top3.length === 0) && (
                    <p className="font-mono text-xs" style={{ color: '#6b7280' }}>
                      No top-3 data available.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visualization */}
        <div className="animate-slide-up mb-8"
          style={{ animationDelay: '0.25s', animationFillMode: 'forwards', opacity: 0 }}>
          <div className="flex items-center gap-3 mb-5">
            <span className="font-mono text-xs tracking-widest" style={{ color: '#3b82f6' }}>
              VISUALIZATION
            </span>
            <div className="h-px flex-1" style={{ background: '#374151' }} />
          </div>
          <VisualizationGallery vizPaths={result.viz_paths} API={API} />
        </div>

        {/* CTA */}
        <button
          onClick={onReset}
          className="w-full py-4 font-black text-sm tracking-widest uppercase rounded-lg transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #3b82f618, #3b82f628)',
            border:     '1px solid #3b82f640',
            color:      '#3b82f6',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow  = '0 0 24px #3b82f618'
            e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f625, #3b82f638)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow  = 'none'
            e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f618, #3b82f628)'
          }}
        >← Run Another Prediction</button>

      </main>
    </div>
  )
}