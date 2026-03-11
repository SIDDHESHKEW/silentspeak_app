import { useEffect, useState } from 'react'

const STAGES = [
  { id: 1, label: 'Extracting frames', duration: 2000 },
  { id: 2, label: 'Detecting facial landmarks', duration: 2500 },
  { id: 3, label: 'Isolating lip region', duration: 2000 },
  { id: 4, label: 'Running 3D-CNN inference', duration: 3000 },
  { id: 5, label: 'Evaluating confidence', duration: 1500 },
]

export default function ProcessingScreen() {
  const [activeStage, setActiveStage] = useState(0)
  const [dots, setDots] = useState('')
  const [chars, setChars] = useState([])

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400)
    return () => clearInterval(interval)
  }, [])

  // Cycle through stages
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

  // Streaming data chars
  useEffect(() => {
    const glyphs = '0123456789ABCDEF'
    const interval = setInterval(() => {
      setChars(Array.from({ length: 12 }, () => ({
        char: glyphs[Math.floor(Math.random() * glyphs.length)],
        opacity: Math.random() * 0.6 + 0.1,
        x: Math.random() * 100,
        y: Math.random() * 100,
      })))
    }, 120)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full opacity-5 animate-pulse"
          style={{ background: 'radial-gradient(circle, #22d3ee, transparent)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-5 animate-pulse"
          style={{ background: 'radial-gradient(circle, #22d3ee, transparent)', animationDelay: '1s' }} />
      </div>

      {/* Floating hex chars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {chars.map((c, i) => (
          <span
            key={i}
            className="absolute font-mono text-xs transition-all duration-200"
            style={{ left: `${c.x}%`, top: `${c.y}%`, color: '#22d3ee', opacity: c.opacity }}
          >
            {c.char}
          </span>
        ))}
      </div>

      {/* Main panel */}
      <div className="relative z-10 w-full max-w-md px-6">

        {/* Neural network visual */}
        <div className="flex justify-center mb-12">
          <div className="relative w-40 h-40">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border opacity-20 animate-orbit"
              style={{ borderColor: '#22d3ee', borderStyle: 'dashed' }} />
            {/* Middle ring */}
            <div className="absolute inset-4 rounded-full border opacity-30 animate-orbit-reverse"
              style={{ borderColor: '#22d3ee' }}>
              {/* Ring dots */}
              {[0, 90, 180, 270].map(deg => (
                <div key={deg} className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    background: '#22d3ee',
                    top: '50%', left: '50%',
                    transform: `rotate(${deg}deg) translateX(40px) translateY(-50%)`,
                  }} />
              ))}
            </div>
            {/* Inner pulse */}
            <div className="absolute inset-10 rounded-full animate-pulse-glow"
              style={{ background: 'radial-gradient(circle, #22d3ee30, #22d3ee10)' }} />
            {/* Center core */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: '#22d3ee20', border: '1px solid #22d3ee60' }}>
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#22d3ee' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Label */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black mb-2" style={{ color: '#e8f4f8' }}>
            Analyzing Lip Movements{dots}
          </h2>
          <p className="font-mono text-xs" style={{ color: '#3a5060' }}>
            3D-CNN INFERENCE IN PROGRESS
          </p>
        </div>

        {/* Stage pipeline */}
        <div className="space-y-2">
          {STAGES.map((stage, i) => {
            const isDone = i < activeStage
            const isActive = i === activeStage
            return (
              <div
                key={stage.id}
                className="flex items-center gap-4 p-3 rounded transition-all duration-500"
                style={{
                  background: isActive ? '#22d3ee08' : 'transparent',
                  border: `1px solid ${isActive ? '#22d3ee30' : 'transparent'}`,
                }}
              >
                {/* Status icon */}
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {isDone ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5" className="w-4 h-4">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#22d3ee' }} />
                  ) : (
                    <div className="w-2 h-2 rounded-full" style={{ background: '#1a2530' }} />
                  )}
                </div>

                {/* Label */}
                <span
                  className="font-mono text-xs flex-1 transition-colors duration-300"
                  style={{ color: isDone ? '#22d3ee80' : isActive ? '#22d3ee' : '#3a5060' }}
                >
                  {stage.label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <span className="font-mono text-xs animate-blink" style={{ color: '#22d3ee' }}>▮</span>
                )}
                {isDone && (
                  <span className="font-mono text-xs" style={{ color: '#22d3ee40' }}>DONE</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-px w-full" style={{ background: '#1a2530' }}>
          <div
            className="h-full transition-all duration-1000"
            style={{
              width: `${((activeStage + 1) / STAGES.length) * 100}%`,
              background: 'linear-gradient(90deg, #22d3ee80, #22d3ee)',
              boxShadow: '0 0 8px #22d3ee',
            }}
          />
        </div>
        <div className="mt-2 text-right font-mono text-xs" style={{ color: '#3a5060' }}>
          {Math.round(((activeStage + 1) / STAGES.length) * 100)}%
        </div>
      </div>
    </div>
  )
}
