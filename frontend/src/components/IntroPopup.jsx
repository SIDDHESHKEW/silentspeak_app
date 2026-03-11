import { useState, useEffect } from 'react'

export default function IntroPopup({ onEnter }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="modal-backdrop grid-bg animate-fade-in">

      {/* Background glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, #3b82f608, transparent)', filter: 'blur(40px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, #38bdf806, transparent)', filter: 'blur(30px)' }} />

      {/* Modal */}
      <div
        className={`relative w-full transition-all duration-700 ease-out
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        style={{
          maxWidth:     '600px',
          maxHeight:    '90vh',
          overflowY:    'auto',
          background:   'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
          border:       '1px solid #374151',
          borderRadius: '8px',
          boxShadow:    '0 0 48px #3b82f60a, 0 32px 64px #00000080',
        }}
      >
        {/* Top accent bar */}
        <div className="h-px w-full sticky top-0 z-10"
          style={{ background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)' }} />

        {/* Corner markers */}
        <div className="absolute top-3 left-3 w-3 h-3 border-t border-l pointer-events-none"
          style={{ borderColor: '#3b82f6' }} />
        <div className="absolute top-3 right-10 w-3 h-3 border-t border-r pointer-events-none"
          style={{ borderColor: '#3b82f6' }} />
        <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l pointer-events-none"
          style={{ borderColor: '#3b82f6' }} />
        <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r pointer-events-none"
          style={{ borderColor: '#3b82f6' }} />

        {/* Close button */}
        <button
          onClick={onEnter}
          aria-label="Close"
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded transition-all duration-200 z-20"
          style={{ color: '#6b7280', border: '1px solid #374151', background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f640' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#374151' }}
        >✕</button>

        <div className="p-8 sm:p-10">

          {/* System tag */}
          <div className="flex items-center gap-2 mb-8">
            <span className="font-mono text-xs tracking-widest" style={{ color: '#3b82f6' }}>SYS</span>
            <div className="h-px flex-1" style={{ background: '#374151' }} />
            <span className="font-mono text-xs" style={{ color: '#6b7280' }}>v1.0</span>
          </div>

          {/* Logo */}
          <div className="mb-6">
            <h1 className="text-5xl font-black tracking-tight leading-none"
              style={{ color: '#f9fafb' }}>
              Silent
              <span className="glow-accent-text" style={{ color: '#3b82f6' }}>Speak</span>
            </h1>
            <div className="mt-2 font-mono text-xs tracking-widest" style={{ color: '#6b7280' }}>
              AI LIP-READING SYSTEM
            </div>
          </div>

          {/* Divider */}
          <div className="h-px mb-6"
            style={{ background: 'linear-gradient(90deg, #3b82f628, transparent)' }} />

          {/* Description */}
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#9ca3af' }}>
            SilentSpeak reads lip movements from video and predicts spoken command phrases using
            a 3D convolutional neural network trained on the GRID corpus.
          </p>

          <p className="text-sm leading-relaxed mb-6" style={{ color: '#9ca3af' }}>
            When lip-reading confidence falls below threshold, the system automatically falls back to{' '}
            <span className="font-mono text-xs px-1.5 py-0.5 rounded"
              style={{ color: '#38bdf8', background: '#38bdf810', border: '1px solid #38bdf822' }}>
              Whisper
            </span>
            {' '}speech recognition for a secondary prediction.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Model',    value: '3D-CNN' },
              { label: 'Classes',  value: '30'     },
              { label: 'Accuracy', value: '97%'    },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-lg"
                style={{ background: '#111827', border: '1px solid #374151' }}>
                <div className="font-mono text-lg font-semibold" style={{ color: '#3b82f6' }}>
                  {s.value}
                </div>
                <div className="font-mono text-xs mt-1" style={{ color: '#6b7280' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline */}
          <div className="mb-6 p-4 rounded-lg"
            style={{ background: '#111827', border: '1px solid #374151' }}>
            <div className="font-mono text-xs tracking-widest mb-3" style={{ color: '#6b7280' }}>
              PIPELINE
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {['Video Input', 'Face Detect', 'Lip Crop', '3D-CNN', 'Softmax', 'Result'].map((step, i, arr) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="font-mono text-xs" style={{ color: '#9ca3af' }}>{step}</span>
                  {i < arr.length - 1 && (
                    <span className="font-mono text-xs" style={{ color: '#374151' }}>→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dev credit */}
          <div className="flex items-center gap-2 mb-8 p-3 rounded-lg"
            style={{ background: '#111827', border: '1px solid #374151' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#22c55e' }} />
            <span className="font-mono text-xs" style={{ color: '#6b7280' }}>DEV</span>
            <span className="font-mono text-xs" style={{ color: '#9ca3af' }}>Siddesh Kewate</span>
          </div>

          {/* CTA */}
          <button
            onClick={onEnter}
            className="w-full py-4 font-bold tracking-widest text-sm uppercase transition-all duration-300 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #3b82f618, #3b82f628)',
              border:     '1px solid #3b82f640',
              color:      '#3b82f6',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f628, #3b82f640)'
              e.currentTarget.style.boxShadow  = '0 0 24px #3b82f620'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f618, #3b82f628)'
              e.currentTarget.style.boxShadow  = 'none'
            }}
          >
            Explore SilentSpeak →
          </button>

        </div>

        {/* Bottom accent bar */}
        <div className="h-px w-full"
          style={{ background: 'linear-gradient(90deg, transparent, #3b82f640, transparent)' }} />
      </div>
    </div>
  )
}