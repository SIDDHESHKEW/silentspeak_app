import { useState, useEffect } from 'react'

export default function IntroPopup({ onEnter }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
  }, [])

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="modal-backdrop grid-bg animate-fade-in">

      {/* Background glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00d4ff08, transparent)', filter: 'blur(40px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7df9ff06, transparent)', filter: 'blur(30px)' }} />

      {/* Modal container — scrollable */}
      <div
        className={`
          relative w-full transition-all duration-700 ease-out
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        `}
        style={{
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'linear-gradient(135deg, #0d1421 0%, #111827 100%)',
          border: '1px solid #1e2d3d',
          borderRadius: '4px',
          boxShadow: '0 0 60px #00d4ff0c, 0 40px 80px #00000090',
        }}
      >
        {/* Top accent bar */}
        <div className="h-px w-full sticky top-0 z-10"
          style={{ background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)' }} />

        {/* Corner markers */}
        <div className="absolute top-3 left-3 w-3 h-3 border-t border-l pointer-events-none"
          style={{ borderColor: '#00d4ff' }} />
        <div className="absolute top-3 right-10 w-3 h-3 border-t border-r pointer-events-none"
          style={{ borderColor: '#00d4ff' }} />
        <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l pointer-events-none"
          style={{ borderColor: '#00d4ff' }} />
        <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r pointer-events-none"
          style={{ borderColor: '#00d4ff' }} />

        {/* Close button */}
        <button
          onClick={onEnter}
          aria-label="Close"
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded transition-all duration-200 z-20"
          style={{
            color: '#4a5568',
            border: '1px solid #1e2d3d',
            background: 'transparent',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#00d4ff'
            e.currentTarget.style.borderColor = '#00d4ff40'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#4a5568'
            e.currentTarget.style.borderColor = '#1e2d3d'
          }}
        >
          ✕
        </button>

        {/* Content */}
        <div className="p-8 sm:p-10">

          {/* System tag */}
          <div className="flex items-center gap-2 mb-8">
            <span className="font-mono text-xs tracking-widest" style={{ color: '#00d4ff' }}>SYS</span>
            <div className="h-px flex-1" style={{ background: '#1e2d3d' }} />
            <span className="font-mono text-xs" style={{ color: '#4a5568' }}>v1.0</span>
          </div>

          {/* Logo */}
          <div className="mb-6">
            <h1 className="text-5xl font-black tracking-tight leading-none" style={{ color: '#e6f1ff' }}>
              Silent
              <span className="glow-cyan-text" style={{ color: '#00d4ff' }}>Speak</span>
            </h1>
            <div className="mt-2 font-mono text-xs tracking-widest" style={{ color: '#4a5568' }}>
              AI LIP-READING SYSTEM
            </div>
          </div>

          {/* Divider */}
          <div className="h-px mb-6"
            style={{ background: 'linear-gradient(90deg, #00d4ff30, transparent)' }} />

          {/* Description */}
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#8892a4' }}>
            SilentSpeak reads lip movements from video and predicts spoken command phrases using
            a 3D convolutional neural network trained on the GRID corpus.
          </p>

          <p className="text-sm leading-relaxed mb-6" style={{ color: '#8892a4' }}>
            When lip-reading confidence falls below threshold, the system automatically falls back to{' '}
            <span className="font-mono text-xs px-1.5 py-0.5 rounded"
              style={{ color: '#00d4ff', background: '#00d4ff12', border: '1px solid #00d4ff25' }}>
              Whisper
            </span>
            {' '}speech recognition for a secondary prediction.
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Model',    value: '3D-CNN' },
              { label: 'Classes',  value: '30'     },
              { label: 'Accuracy', value: '97%'    },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded"
                style={{ background: '#0b0f17', border: '1px solid #1e2d3d' }}>
                <div className="font-mono text-lg font-semibold" style={{ color: '#00d4ff' }}>
                  {s.value}
                </div>
                <div className="font-mono text-xs mt-1" style={{ color: '#4a5568' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline steps */}
          <div className="mb-6 p-4 rounded" style={{ background: '#0b0f17', border: '1px solid #1e2d3d' }}>
            <div className="font-mono text-xs tracking-widest mb-3" style={{ color: '#4a5568' }}>
              PIPELINE
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {['Video Input', 'Face Detect', 'Lip Crop', '3D-CNN', 'Softmax', 'Result'].map((step, i, arr) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="font-mono text-xs" style={{ color: '#8892a4' }}>{step}</span>
                  {i < arr.length - 1 && (
                    <span className="font-mono text-xs" style={{ color: '#1e2d3d' }}>→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Developer credit */}
          <div className="flex items-center gap-2 mb-8 p-3 rounded"
            style={{ background: '#0b0f17', border: '1px solid #1e2d3d' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00d4ff' }} />
            <span className="font-mono text-xs" style={{ color: '#4a5568' }}>DEV</span>
            <span className="font-mono text-xs" style={{ color: '#8892a4' }}>Siddesh Kewate</span>
          </div>

          {/* CTA Button */}
          <button
            onClick={onEnter}
            className="w-full py-4 font-bold tracking-widest text-sm uppercase transition-all duration-300 rounded relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #00d4ff18, #00d4ff28)',
              border: '1px solid #00d4ff40',
              color: '#00d4ff',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #00d4ff28, #00d4ff40)'
              e.currentTarget.style.boxShadow = '0 0 28px #00d4ff25'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #00d4ff18, #00d4ff28)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Explore SilentSpeak →
          </button>

        </div>

        {/* Bottom accent bar */}
        <div className="h-px w-full"
          style={{ background: 'linear-gradient(90deg, transparent, #00d4ff40, transparent)' }} />
      </div>
    </div>
  )
}