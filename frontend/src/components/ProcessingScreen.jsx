import { useEffect, useState } from 'react'

const STAGES = [
  { id: 1, label: 'Extracting frames',          duration: 2000 },
  { id: 2, label: 'Detecting facial landmarks', duration: 2500 },
  { id: 3, label: 'Isolating lip region',        duration: 2000 },
  { id: 4, label: 'Running 3D-CNN inference',   duration: 3000 },
  { id: 5, label: 'Evaluating confidence',       duration: 1500 },
]

export default function ProcessingScreen() {
  const [activeStage, setActiveStage] = useState(0)
  const [dots,        setDots]        = useState('')
  const [chars,       setChars]       = useState([])

  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    let idx = 0
    const next = () => {
      if (idx < STAGES.length - 1) {
        idx++
        setActiveStage(idx)
        setTimeout(next, STAGES[idx].duration)
      }
    }
    setTimeout(next, STAGES[0].duration)
  }, [])

  useEffect(() => {
    const glyphs = '0123456789ABCDEF'
    const iv = setInterval(() => {
      setChars(Array.from({ length: 14 }, () => ({
        char:    glyphs[Math.floor(Math.random() * glyphs.length)],
        opacity: Math.random() * 0.4 + 0.04,
        x:       Math.random() * 100,
        y:       Math.random() * 100,
      })))
    }, 120)
    return () => clearInterval(iv)
  }, [])

  const progress = Math.round(((activeStage + 1) / STAGES.length) * 100)

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden">

      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full opacity-[0.04] animate-pulse"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full opacity-[0.04] animate-pulse"
          style={{ background: 'radial-gradient(circle, #38bdf8, transparent)', filter: 'blur(30px)', animationDelay: '1s' }} />
      </div>

      {/* Floating hex chars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {chars.map((c, i) => (
          <span key={i} className="absolute font-mono text-xs select-none transition-all duration-200"
            style={{ left: `${c.x}%`, top: `${c.y}%`, color: '#3b82f6', opacity: c.opacity }}>
            {c.char}
          </span>
        ))}
      </div>

      {/* Main panel */}
      <div className="relative z-10 w-full max-w-md px-6">

        {/* Neural ring */}
        <div className="flex justify-center mb-12">
          <div className="relative w-40 h-40">
            <div className="absolute inset-0 rounded-full border animate-orbit"
              style={{ borderColor: '#3b82f6', borderStyle: 'dashed', opacity: 0.2 }} />
            <div className="absolute inset-4 rounded-full border animate-orbit-reverse"
              style={{ borderColor: '#3b82f6', opacity: 0.3 }}>
              {[0, 90, 180, 270].map(deg => (
                <div key={deg} className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    background: '#3b82f6',
                    top: '50%', left: '50%',
                    transform: `rotate(${deg}deg) translateX(40px) translateY(-50%)`,
                  }} />
              ))}
            </div>
            <div className="absolute inset-10 rounded-full animate-pulse-glow"
              style={{ background: 'radial-gradient(circle, #3b82f622, #3b82f608)' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: '#3b82f615', border: '1px solid #3b82f640' }}>
                <div className="w-3 h-3 rounded-full animate-pulse"
                  style={{ background: '#3b82f6' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black mb-2" style={{ color: '#f9fafb' }}>
            Analyzing Lip Movements{dots}
          </h2>
          <p className="font-mono text-xs" style={{ color: '#6b7280' }}>
            3D-CNN INFERENCE IN PROGRESS
          </p>
        </div>

        {/* Stages */}
        <div className="space-y-2 mb-6">
          {STAGES.map((stage, i) => {
            const isDone   = i < activeStage
            const isActive = i === activeStage
            return (
              <div key={stage.id}
                className="flex items-center gap-4 p-3 rounded-lg transition-all duration-500"
                style={{
                  background: isActive ? '#3b82f608' : 'transparent',
                  border:     `1px solid ${isActive ? '#3b82f625' : 'transparent'}`,
                }}>
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {isDone ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" className="w-4 h-4">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#3b82f6' }} />
                  ) : (
                    <div className="w-2 h-2 rounded-full" style={{ background: '#374151' }} />
                  )}
                </div>
                <span className="font-mono text-xs flex-1 transition-colors duration-300"
                  style={{ color: isDone ? '#22c55e80' : isActive ? '#3b82f6' : '#6b7280' }}>
                  {stage.label}
                </span>
                {isActive && (
                  <span className="font-mono text-xs animate-blink" style={{ color: '#3b82f6' }}>▮</span>
                )}
                {isDone && (
                  <span className="font-mono text-xs" style={{ color: '#22c55e40' }}>DONE</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="confidence-bar-track h-1.5">
          <div className="confidence-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex justify-between font-mono text-xs" style={{ color: '#6b7280' }}>
          <span>PROCESSING</span>
          <span style={{ color: '#3b82f6' }}>{progress}%</span>
        </div>

      </div>
    </div>
  )
}