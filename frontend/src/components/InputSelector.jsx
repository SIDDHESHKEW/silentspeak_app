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
    tagColor: '#00d4ff',
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
  { step: '01', label: 'Video Input',   desc: 'Feed a video via demo, upload, or webcam' },
  { step: '02', label: 'Face Detect',   desc: 'OpenCV locates the face and crops the lip region' },
  { step: '03', label: '3D-CNN',        desc: 'Frame sequence processed by convolutional network' },
  { step: '04', label: 'Prediction',    desc: 'Softmax over 30 GRID commands returns result' },
]

const vizLabels = [
  { key: 'original',  label: 'Original Frame' },
  { key: 'face',      label: 'Face Detection' },
  { key: 'lip',       label: 'Lip Crop'       },
]

export default function InputSelector({ onSelect }) {
  return (
    <div className="w-full px-4 sm:px-6 pb-16">
      <div className="max-w-3xl mx-auto">

        {/* ── Section label ── */}
        <div className="flex items-center gap-3 mb-3 animate-fade-in">
          <span className="font-mono text-xs tracking-widest" style={{ color: '#00d4ff' }}>
            INPUT
          </span>
          <div className="h-px flex-1" style={{ background: '#1e2d3d' }} />
        </div>

        <h2 className="text-3xl sm:text-4xl font-black mb-2 animate-slide-up"
          style={{ color: '#e6f1ff' }}>
          Select Input Source
        </h2>
        <p className="text-sm mb-8 animate-slide-up delay-100" style={{ color: '#8892a4' }}>
          Choose how you want to feed video into the lip-reading system.
        </p>

        {/* ── Option cards ── */}
        <div className="grid gap-3 mb-16">
          {options.map((opt, i) => (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className="group text-left p-5 sm:p-6 rounded transition-all duration-300 animate-slide-up"
              style={{
                background:          '#0d1421',
                border:              '1px solid #1e2d3d',
                animationDelay:      `${i * 0.1}s`,
                animationFillMode:   'forwards',
                opacity:             0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.border     = '1px solid #00d4ff35'
                e.currentTarget.style.boxShadow  = '0 0 24px #00d4ff0c'
                e.currentTarget.style.background = '#0d1421'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.border     = '1px solid #1e2d3d'
                e.currentTarget.style.boxShadow  = 'none'
                e.currentTarget.style.background = '#0d1421'
              }}
            >
              <div className="flex items-start gap-4 sm:gap-5">
                {/* Icon */}
                <div className="flex-shrink-0 p-3 rounded"
                  style={{ background: '#0b0f17', color: '#00d4ff' }}>
                  {opt.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-base sm:text-lg"
                      style={{ color: '#e6f1ff' }}>
                      {opt.label}
                    </span>
                    <span
                      className="font-mono text-xs px-2 py-0.5 rounded"
                      style={{
                        color:      opt.tagColor,
                        background: `${opt.tagColor}12`,
                        border:     `1px solid ${opt.tagColor}30`,
                      }}
                    >
                      {opt.tag}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: '#8892a4' }}>{opt.desc}</p>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 self-center transition-transform duration-300 group-hover:translate-x-1"
                  style={{ color: '#4a5568' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                    className="w-5 h-5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* ── How it works ── */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'forwards', opacity: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-xs tracking-widest" style={{ color: '#00d4ff' }}>
              PIPELINE
            </span>
            <div className="h-px flex-1" style={{ background: '#1e2d3d' }} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {howItWorks.map((item, i) => (
              <div key={item.step}
                className="p-4 rounded text-center"
                style={{ background: '#0d1421', border: '1px solid #1e2d3d' }}>
                <div className="font-mono text-xs mb-2" style={{ color: '#00d4ff' }}>
                  {item.step}
                </div>
                <div className="font-bold text-sm mb-1" style={{ color: '#e6f1ff' }}>
                  {item.label}
                </div>
                <div className="font-mono text-xs leading-relaxed" style={{ color: '#4a5568' }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Visualization showcase ── */}
        <div className="animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'forwards', opacity: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-xs tracking-widest" style={{ color: '#00d4ff' }}>
              VISUALIZATION
            </span>
            <div className="h-px flex-1" style={{ background: '#1e2d3d' }} />
            <span className="font-mono text-xs" style={{ color: '#4a5568' }}>
              SAMPLE OUTPUT
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {vizLabels.map(({ key, label }) => (
              <div key={key}
                style={{ border: '1px solid #1e2d3d', borderRadius: '4px', overflow: 'hidden' }}>
                <div className="px-3 py-2 font-mono text-xs"
                  style={{ background: '#0b0f17', color: '#4a5568', borderBottom: '1px solid #1e2d3d' }}>
                  {label}
                </div>
                <div className="aspect-video flex items-center justify-center"
                  style={{ background: '#0b0f17' }}>
                  <img
                    src={`${API}/assets/viz_output/sample_${key}.jpg`}
                    alt={label}
                    className="w-full h-full object-cover"
                    onError={e => {
                      // Graceful fallback if sample images not yet generated
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement.innerHTML = `
                        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:24px;">
                          <div style="font-size:24px;opacity:0.2">◈</div>
                          <div style="font-family:monospace;font-size:10px;color:#4a5568">${label}</div>
                        </div>`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 font-mono text-xs text-center" style={{ color: '#4a5568' }}>
            Visualization frames are generated automatically during inference
          </p>
        </div>

      </div>
    </div>
  )
}