const API = 'http://localhost:8000'

export default function ResultPanel({ result, onReset }) {
  const isLipReading = result.source === 'lip_reading'
  const confidencePct = Math.round((result.confidence || 0) * 100)

  const getConfidenceColor = (pct) => {
    if (pct >= 80) return '#22d3ee'
    if (pct >= 60) return '#a3e635'
    if (pct >= 40) return '#f59e0b'
    return '#f87171'
  }

  const confColor = getConfidenceColor(confidencePct)

  return (
    <div className="min-h-screen grid-bg flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between" style={{ borderBottom: '1px solid #1a2530' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: '#22d3ee' }} />
          <span className="font-black text-xl tracking-tight" style={{ color: '#e8f4f8' }}>
            Silent<span style={{ color: '#22d3ee' }}>Speak</span>
          </span>
        </div>
        <button
          onClick={onReset}
          className="font-mono text-xs px-4 py-2 rounded transition-all duration-200"
          style={{ color: '#22d3ee', border: '1px solid #22d3ee30', background: '#22d3ee10' }}
          onMouseEnter={e => e.currentTarget.style.background = '#22d3ee20'}
          onMouseLeave={e => e.currentTarget.style.background = '#22d3ee10'}
        >
          ← NEW PREDICTION
        </button>
      </header>

      <main className="flex-1 px-6 py-12 max-w-3xl mx-auto w-full">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-3 animate-fade-in">
          <span className="font-mono text-xs tracking-widest" style={{ color: '#22d3ee' }}>RESULT</span>
          <div className="h-px flex-1" style={{ background: '#1a2530' }} />
          <span className="font-mono text-xs" style={{ color: '#3a5060' }}>ANALYSIS COMPLETE</span>
        </div>

        {/* Main result card */}
        <div
          className="mb-6 animate-slide-up"
          style={{
            background: 'linear-gradient(135deg, #080d12, #0c1218)',
            border: '1px solid #1a2530',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          {/* Top accent */}
          <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, #22d3ee, transparent)' }} />

          <div className="p-8">
            {/* Source badge */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs"
                style={{
                  background: isLipReading ? '#22d3ee15' : '#f59e0b15',
                  border: `1px solid ${isLipReading ? '#22d3ee40' : '#f59e0b40'}`,
                  color: isLipReading ? '#22d3ee' : '#f59e0b',
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: isLipReading ? '#22d3ee' : '#f59e0b' }} />
                {isLipReading ? 'LIP READING' : 'SPEECH FALLBACK'}
              </div>
              <span className="font-mono text-xs" style={{ color: '#3a5060' }}>
                {isLipReading ? 'High confidence — primary model used' : 'Low confidence — Whisper fallback activated'}
              </span>
            </div>

            {/* Predicted sentence */}
            <div className="mb-6">
              <div className="font-mono text-xs mb-2" style={{ color: '#3a5060' }}>PREDICTED COMMAND</div>
              <div
                className="text-3xl font-black tracking-tight glow-cyan-text"
                style={{ color: '#22d3ee', lineHeight: 1.2 }}
              >
                {result.sentence || result.predicted_sentence || '—'}
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Confidence */}
              <div className="p-4 rounded" style={{ background: '#040608', border: '1px solid #1a2530' }}>
                <div className="font-mono text-xs mb-2" style={{ color: '#3a5060' }}>CONFIDENCE</div>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-3xl font-black font-mono" style={{ color: confColor }}>{confidencePct}%</span>
                </div>
                {/* Bar */}
                <div className="h-1 rounded-full" style={{ background: '#1a2530' }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${confidencePct}%`, background: confColor, boxShadow: `0 0 8px ${confColor}60` }}
                  />
                </div>
              </div>

              {/* Top-3 */}
              <div className="p-4 rounded" style={{ background: '#040608', border: '1px solid #1a2530' }}>
                <div className="font-mono text-xs mb-3" style={{ color: '#3a5060' }}>TOP PREDICTIONS</div>
                <div className="space-y-1.5">
                  {(result.top3 || []).slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-mono text-xs w-4" style={{ color: '#3a5060' }}>{i + 1}.</span>
                      <span className="font-mono text-xs flex-1 truncate" style={{ color: i === 0 ? '#e8f4f8' : '#6b8a9a' }}>
                        {item.label}
                      </span>
                      <span className="font-mono text-xs" style={{ color: i === 0 ? confColor : '#3a5060' }}>
                        {Math.round(item.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visualization frames */}
        {result.viz_paths && result.viz_paths.length > 0 && (
          <div className="animate-slide-up delay-200" style={{ animationFillMode: 'both' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-xs tracking-widest" style={{ color: '#22d3ee' }}>VISUALIZATION</span>
              <div className="h-px flex-1" style={{ background: '#1a2530' }} />
            </div>

            {/* Group frames by type */}
            {['original', 'detect', 'lip'].map(frameType => {
              const frames = result.viz_paths.filter(p => p.includes(frameType))
              if (!frames.length) return null

              const labels = { original: 'Original Frame', detect: 'Face + Lip Detection', lip: 'Lip Crop' }

              return (
                <div key={frameType} className="mb-6">
                  <div className="font-mono text-xs mb-3" style={{ color: '#3a5060' }}>{labels[frameType]}</div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {frames.map((path, i) => (
                      <div
                        key={i}
                        className="flex-shrink-0"
                        style={{ border: '1px solid #1a2530', borderRadius: '2px', overflow: 'hidden' }}
                      >
                        <img
                          src={`${API}${path}`}
                          alt={`${frameType} frame ${i}`}
                          className="h-24 w-auto object-cover"
                          style={{ display: 'block' }}
                          onError={e => e.currentTarget.style.display = 'none'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* No viz fallback */}
        {(!result.viz_paths || result.viz_paths.length === 0) && (
          <div className="p-6 rounded text-center animate-fade-in" style={{ background: '#080d12', border: '1px solid #1a2530' }}>
            <p className="font-mono text-xs" style={{ color: '#3a5060' }}>No visualization frames available for this prediction.</p>
          </div>
        )}

        {/* New prediction button */}
        <button
          onClick={onReset}
          className="w-full mt-8 py-4 font-black text-sm tracking-widest uppercase rounded transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #22d3ee15, #22d3ee25)',
            border: '1px solid #22d3ee40',
            color: '#22d3ee',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 30px #22d3ee20'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          ← Run Another Prediction
        </button>
      </main>
    </div>
  )
}
