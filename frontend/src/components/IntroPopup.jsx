import { useState, useEffect } from 'react'

export default function IntroPopup({ onEnter }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 grid-bg">
      {/* Background glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-5"
        style={{ background: 'radial-gradient(circle, #22d3ee, transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-5"
        style={{ background: 'radial-gradient(circle, #22d3ee, transparent)' }} />

      <div
        className={`relative max-w-lg w-full transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        style={{
          background: 'linear-gradient(135deg, #080d12 0%, #0c1218 100%)',
          border: '1px solid #1a2530',
          borderRadius: '2px',
          boxShadow: '0 0 60px #22d3ee10, 0 40px 80px #00000080'
        }}
      >
        {/* Top accent bar */}
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #22d3ee, transparent)' }} />

        {/* Corner markers */}
        <div className="absolute top-3 left-3 w-3 h-3 border-t border-l" style={{ borderColor: '#22d3ee' }} />
        <div className="absolute top-3 right-3 w-3 h-3 border-t border-r" style={{ borderColor: '#22d3ee' }} />
        <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l" style={{ borderColor: '#22d3ee' }} />
        <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r" style={{ borderColor: '#22d3ee' }} />

        <div className="p-10">
          {/* System tag */}
          <div className="flex items-center gap-2 mb-8">
            <span className="font-mono text-xs tracking-widest" style={{ color: '#22d3ee' }}>SYS</span>
            <div className="h-px flex-1" style={{ background: '#1a2530' }} />
            <span className="font-mono text-xs" style={{ color: '#3a5060' }}>v1.0</span>
          </div>

          {/* Logo */}
          <div className="mb-6">
            <h1 className="text-5xl font-black tracking-tight leading-none" style={{ color: '#e8f4f8' }}>
              Silent
              <span style={{ color: '#22d3ee' }} className="glow-cyan-text">Speak</span>
            </h1>
            <div className="mt-2 font-mono text-xs tracking-widest" style={{ color: '#3a5060' }}>
              AI LIP-READING SYSTEM
            </div>
          </div>

          {/* Divider */}
          <div className="h-px mb-6" style={{ background: 'linear-gradient(90deg, #22d3ee30, transparent)' }} />

          {/* Description */}
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#6b8a9a' }}>
            SilentSpeak reads lip movements from video and predicts spoken command phrases using a 3D convolutional neural network trained on the GRID corpus.
          </p>

          <p className="text-sm leading-relaxed mb-6" style={{ color: '#6b8a9a' }}>
            When lip-reading confidence falls below threshold, the system automatically falls back to{' '}
            <span className="font-mono text-xs px-1 py-0.5 rounded" style={{ color: '#22d3ee', background: '#22d3ee15' }}>
              Whisper
            </span>
            {' '}speech recognition for a secondary prediction.
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Model', value: '3D-CNN' },
              { label: 'Classes', value: '30' },
              { label: 'Accuracy', value: '97%' },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded" style={{ background: '#040608', border: '1px solid #1a2530' }}>
                <div className="font-mono text-lg font-semibold" style={{ color: '#22d3ee' }}>{s.value}</div>
                <div className="font-mono text-xs mt-1" style={{ color: '#3a5060' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Developer credit */}
          <div className="flex items-center gap-2 mb-8 p-3 rounded" style={{ background: '#040608', border: '1px solid #1a2530' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22d3ee' }} />
            <span className="font-mono text-xs" style={{ color: '#3a5060' }}>DEV</span>
            <span className="font-mono text-xs" style={{ color: '#6b8a9a' }}>Siddesh Kewate</span>
          </div>

          {/* CTA Button */}
          <button
            onClick={onEnter}
            className="w-full py-4 font-bold tracking-widest text-sm uppercase transition-all duration-300 rounded relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, #22d3ee15, #22d3ee25)',
              border: '1px solid #22d3ee40',
              color: '#22d3ee',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #22d3ee25, #22d3ee40)'
              e.currentTarget.style.boxShadow = '0 0 30px #22d3ee30'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #22d3ee15, #22d3ee25)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Explore SilentSpeak
            <span className="ml-2">→</span>
          </button>
        </div>

        {/* Bottom accent bar */}
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #22d3ee40, transparent)' }} />
      </div>
    </div>
  )
}
