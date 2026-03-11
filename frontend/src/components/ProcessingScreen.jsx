import { useEffect, useState } from 'react'

const STAGES = [
  { id: 1, label: 'Extracting frames',           duration: 2000 },
  { id: 2, label: 'Detecting facial landmarks',  duration: 2500 },
  { id: 3, label: 'Isolating lip region',         duration: 2000 },
  { id: 4, label: 'Running 3D-CNN inference',    duration: 3000 },
  { id: 5, label: 'Evaluating confidence',        duration: 1500 },
]

export default function ProcessingScreen() {
  const [activeStage, setActiveStage] = useState(0)
  const [dots,        setDots]        = useState('')
  const [chars,       setChars]       = useState([])

  // Animate ellipsis dots
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400)
    return () => clearInterval(iv)
  }, [])

  // Cycle through pipeline stages
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

  // Floating hex data stream
  useEffect(() => {
    const glyphs = '0123456789ABCDEF'
    const iv = setInterval(() => {
      setChars(Array.from({ length: 14 }, () => ({
        char:    glyphs[Math.floor(Math.random() * glyphs.length)],
        opacity: Math.random() * 0.5 + 0.05,
        x:       Math.random() * 100,
        y:       Math.random() * 100,
      })))
    }, 120)
    return () => clearInterval(iv)
  }, [])

  const progress = Math.round(((activeStage + 1) / STAGES.length) * 100)

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden">

      {/* Ambient background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full opacity-[0.04] animate-pulse"
          style={{ background: 'radial-gradient(circle, #00d4ff, transparent)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full opacity-[0.04] animate-pulse"
          style={{ background: 'radial-gradient(circle, #7df9ff, transparent)', filter: 'blur(30px)', animationDelay: '1s' }} />
      </div>

      {/* Floating hex chars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {chars.map((c, i) => (
          <span
            key={i}
            className="absolute font-mono text-xs transition-all duration-200 select-none"
            style={{ left: `${c.x}%`, top: `${c.y}%`, color: '#00d4ff', opacity: c.opacity }}
          >
            {c.char}
          </span>
        ))}
      </div>

      {/* Main panel */}
      <div className="relative z-10 w-full max-w-md px-6">

        {/* Neural ring visual */}
        <div className="flex justify-center mb-12">
          <div className="relative w-40 h-40">

            {/* Outer dashed ring */}
            <div
              className="absolute inset-0 rounded-full border animate-orbit"
              style={{ borderColor: '#00d4ff', borderStyle: 'dashed', opacity: 0.2 }}
            />

            {/* Middle ring with dots */}
            <div
              className="absolute inset-4 rounded-full border animate-orbit-reverse"
              style={{ borderColor: '#00d4ff', opacity: 0.3 }}
            >
              {[0, 90, 180, 270].map(deg => (
                <div
                  key={deg}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    background:  '#00d4ff',
                    top:         '50%',
                    left:        '50%',
                    transform:   `rotate(${deg}deg) translateX(40px) translateY(-50%)`,
                  }}
                />
              ))}
            </div>

            {/* Inner pulse glow */}
            <div
              className="absolute inset-10 rounded-full animate-pulse-glow"
              style={{ background: 'radial-gradient(circle, #00d4ff28, #00d4ff0a)' }}
            />

            {/* Center core */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: '#00d4ff18', border: '1px solid #00d4ff50' }}
              >
                <div
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ background: '#00d4ff' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black mb-2" style={{ color: '#e6f1ff' }}>
            Analyzing Lip Movements{dots}
          </h2>
          <p className="font-mono text-xs" style={{ color: '#4a5568' }}>
            3D-CNN INFERENCE IN PROGRESS
          </p>
        </div>

        {/* Stage pipeline */}
        <div className="space-y-2 mb-6">
          {STAGES.map((stage, i) => {
            const isDone   = i < activeStage
            const isActive = i === activeStage

            return (
              <div
                key={stage.id}
                className="flex items-center gap-4 p-3 rounded transition-all duration-500"
                style={{
                  background: isActive ? '#00d4ff08' : 'transparent',
                  border:     `1px solid ${isActive ? '#00d4ff28' : 'transparent'}`,
                }}
              >
                {/* Status icon */}
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {isDone ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#00d4ff"
                      strokeWidth="2.5" className="w-4 h-4">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-3 h-3 rounded-full animate-pulse"
                      style={{ background: '#00d4ff' }} />
                  ) : (
                    <div className="w-2 h-2 rounded-full"
                      style={{ background: '#1e2d3d' }} />
                  )}
                </div>

                {/* Stage label */}
                <span
                  className="font-mono text-xs flex-1 transition-colors duration-300"
                  style={{
                    color: isDone   ? '#00d4ff70'  :
                           isActive ? '#00d4ff'     : '#4a5568',
                  }}
                >
                  {stage.label}
                </span>

                {/* Right indicator */}
                {isActive && (
                  <span className="font-mono text-xs animate-blink"
                    style={{ color: '#00d4ff' }}>▮</span>
                )}
                {isDone && (
                  <span className="font-mono text-xs"
                    style={{ color: '#00d4ff35' }}>DONE</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="confidence-bar-track h-1.5">
          <div
            className="confidence-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-xs"
          style={{ color: '#4a5568' }}>
          <span>PROCESSING</span>
          <span style={{ color: '#00d4ff' }}>{progress}%</span>
        </div>

      </div>
    </div>
  )
}