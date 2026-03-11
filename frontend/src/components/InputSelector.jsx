import { useEffect, useRef } from 'react'

const API = 'http://localhost:8000'

const options = [
  {
    id: 'grid',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <rect x="2" y="3" width="20" height="14" rx="1" />
        <path d="M8 21h8M12 17v4" />
        <circle cx="12" cy="10" r="3" />
        <path d="m9 10 1.5 1.5L13 8" />
      </svg>
    ),
    label:    'Demo GRID Video',
    desc:     'Select from pre-loaded GRID corpus samples. Best accuracy guaranteed.',
    tag:      'RECOMMENDED',
    tagColor: '#3b82f6',
  },
  {
    id: 'upload',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    label:    'Upload Video',
    desc:     'Upload your own video file. Speak in GRID command format for best results.',
    tag:      'EXPERIMENTAL',
    tagColor: '#f59e0b',
  },
  {
    id: 'webcam',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
        <circle cx="8.5" cy="12" r="2" />
      </svg>
    ),
    label:    'Live Webcam',
    desc:     'Record directly from your camera. Speak in GRID command format for best results.',
    tag:      'EXPERIMENTAL',
    tagColor: '#f59e0b',
  },
]

const howItWorks = [
  { step: '01', label: 'Video Input',  desc: 'Feed via demo, upload, or webcam'       },
  { step: '02', label: 'Face Detect',  desc: 'OpenCV crops the lip region'            },
  { step: '03', label: '3D-CNN',       desc: 'Frame sequence through neural network'  },
  { step: '04', label: 'Prediction',   desc: 'Softmax over 30 GRID commands'          },
]

const vizLabels = [
  { key: 'original', label: 'Original Frame' },
  { key: 'detect',   label: 'Face Detection' },  // ✅ was 'face' — inference saves *_detect.jpg
  { key: 'lip',      label: 'Lip Crop'       },
]

// ── Animated neural canvas — large screens only ──────────────
function NeuralCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const nodes = Array.from({ length: 28 }, () => ({
      x:   Math.random() * canvas.width,
      y:   Math.random() * canvas.height,
      vx:  (Math.random() - 0.5) * 0.4,
      vy:  (Math.random() - 0.5) * 0.4,
      r:   Math.random() * 2 + 1,
    }))

    let animId

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      nodes.forEach(n => {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      })

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx   = nodes[i].x - nodes[j].x
          const dy   = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(59,130,246,${(1 - dist / 120) * 0.18})`
            ctx.lineWidth   = 1
            ctx.stroke()
          }
        }
      }

      nodes.forEach(n => {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(59,130,246,0.45)'
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  )
}

// ── Main component ────────────────────────────────────────────
export default function InputSelector({ onSelect }) {
  return (
    <div className="w-full flex flex-col xl:flex-row xl:items-start">

      {/* ── LEFT COLUMN ── */}
      <div className="flex-1 px-6 sm:px-10 pb-20 min-w-0">
        <div className="max-w-3xl">

          {/* Input option cards */}
          <div className="grid gap-3 mb-16">
            {options.map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => onSelect(opt.id)}
                className="group text-left p-5 sm:p-6 rounded-lg transition-all duration-200 animate-slide-up"
                style={{
                  background:        '#1f2937',
                  border:            '1px solid #374151',
                  animationDelay:    `${i * 0.08}s`,
                  animationFillMode: 'forwards',
                  opacity:           0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.border    = '1px solid #3b82f630'
                  e.currentTarget.style.boxShadow = '0 2px 16px #3b82f610'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border    = '1px solid #374151'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div className="flex items-start gap-4 sm:gap-5">
                  <div className="flex-shrink-0 p-3 rounded-lg"
                    style={{ background: '#111827', color: '#3b82f6' }}>
                    {opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-base sm:text-lg"
                        style={{ color: '#f9fafb' }}>{opt.label}</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded"
                        style={{
                          color:      opt.tagColor,
                          background: `${opt.tagColor}12`,
                          border:     `1px solid ${opt.tagColor}28`,
                        }}>
                        {opt.tag}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed"
                      style={{ color: '#9ca3af' }}>{opt.desc}</p>
                  </div>
                  <div className="flex-shrink-0 self-center transition-transform duration-200 group-hover:translate-x-1"
                    style={{ color: '#6b7280' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.5" className="w-5 h-5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Pipeline */}
          <div className="mb-16 animate-fade-in"
            style={{ animationDelay: '0.3s', animationFillMode: 'forwards', opacity: 0 }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="font-mono text-xs tracking-widest"
                style={{ color: '#3b82f6' }}>PIPELINE</span>
              <div className="h-px flex-1" style={{ background: '#374151' }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {howItWorks.map(item => (
                <div key={item.step} className="p-4 rounded-lg"
                  style={{ background: '#1f2937', border: '1px solid #374151' }}>
                  <div className="font-mono text-xs mb-2" style={{ color: '#3b82f6' }}>
                    {item.step}
                  </div>
                  <div className="font-bold text-sm mb-1" style={{ color: '#f9fafb' }}>
                    {item.label}
                  </div>
                  <div className="font-mono text-xs leading-relaxed"
                    style={{ color: '#6b7280' }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Visualization showcase */}
          <div className="animate-fade-in"
            style={{ animationDelay: '0.45s', animationFillMode: 'forwards', opacity: 0 }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="font-mono text-xs tracking-widest"
                style={{ color: '#3b82f6' }}>VISUALIZATION</span>
              <div className="h-px flex-1" style={{ background: '#374151' }} />
              <span className="font-mono text-xs" style={{ color: '#6b7280' }}>
                SAMPLE OUTPUT
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {vizLabels.map(({ key, label }) => (
                <div key={key} className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid #374151' }}>
                  <div className="px-3 py-2 font-mono text-xs"
                    style={{ background: '#111827', color: '#6b7280', borderBottom: '1px solid #374151' }}>
                    {label}
                  </div>
                  <div className="aspect-video flex items-center justify-center"
                    style={{ background: '#111827' }}>
                    <img
                      src={`${API}/assets/viz_output/sample_${key}.jpg`}
                      alt={label}
                      className="w-full h-full object-cover"
                      onError={e => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.parentElement.innerHTML = `
                          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:20px;">
                            <div style="font-size:20px;opacity:0.12">◈</div>
                            <div style="font-family:monospace;font-size:10px;color:#6b7280">${label}</div>
                            <div style="font-family:monospace;font-size:9px;color:#374151">awaiting inference</div>
                          </div>`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 font-mono text-xs" style={{ color: '#6b7280' }}>
              Visualization frames are generated automatically during inference.
            </p>
          </div>

        </div>
      </div>

      {/* ── RIGHT COLUMN — xl screens only ── */}
      <div
        className="hidden xl:flex flex-col items-center justify-start pt-4 pr-10"
        style={{ width: '380px', flexShrink: 0 }}
      >
        <div
          className="sticky top-8 w-full rounded-xl overflow-hidden animate-fade-in"
          style={{
            background:        '#1f2937',
            border:            '1px solid #374151',
            animationDelay:    '0.5s',
            animationFillMode: 'forwards',
            opacity:           0,
          }}
        >
          <div className="px-5 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid #374151' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#22c55e' }} />
            <span className="font-mono text-xs tracking-widest"
              style={{ color: '#6b7280' }}>NEURAL NETWORK</span>
          </div>

          <div style={{ height: '260px', background: '#111827' }}>
            <NeuralCanvas />
          </div>

          <div className="p-5 grid grid-cols-3 gap-3">
            {[
              { label: 'Model',    value: '3D-CNN' },
              { label: 'Classes',  value: '30'     },
              { label: 'Accuracy', value: '97%'    },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-lg"
                style={{ background: '#111827', border: '1px solid #374151' }}>
                <div className="font-mono text-base font-bold"
                  style={{ color: '#3b82f6' }}>{s.value}</div>
                <div className="font-mono text-xs mt-1"
                  style={{ color: '#6b7280' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="px-5 pb-5">
            <div className="font-mono text-xs mb-3" style={{ color: '#6b7280' }}>
              INFERENCE PIPELINE
            </div>
            <div className="space-y-2">
              {['Video Input', 'Face Detect', 'Lip Crop', '3D-CNN', 'Softmax → Result'].map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: '#3b82f6', opacity: 0.5 + i * 0.1 }} />
                  <span className="font-mono text-xs" style={{ color: '#9ca3af' }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}