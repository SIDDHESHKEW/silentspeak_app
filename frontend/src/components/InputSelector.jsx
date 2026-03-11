export default function InputSelector({ onSelect }) {
  const options = [
    {
      id: 'grid',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
          <rect x="2" y="3" width="20" height="14" rx="1" />
          <path d="M8 21h8M12 17v4" />
          <circle cx="12" cy="10" r="3" />
          <path d="m9 10 1.5 1.5L13 8" />
        </svg>
      ),
      label: 'Demo GRID Video',
      desc: 'Select from pre-loaded GRID corpus samples. Best accuracy guaranteed.',
      tag: 'RECOMMENDED',
      tagColor: '#22d3ee',
    },
    {
      id: 'upload',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
      label: 'Upload Video',
      desc: 'Upload your own video file for lip-reading analysis.',
      tag: 'EXPERIMENTAL',
      tagColor: '#f59e0b',
    },
    {
      id: 'webcam',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
          <path d="M23 7l-7 5 7 5V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
          <circle cx="8.5" cy="12" r="2" />
        </svg>
      ),
      label: 'Live Webcam',
      desc: 'Record directly from your camera for real-time analysis.',
      tag: 'EXPERIMENTAL',
      tagColor: '#f59e0b',
    },
  ]

  return (
    <div className="min-h-screen grid-bg flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between" style={{ borderBottom: '1px solid #1a2530' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22d3ee' }} />
          <span className="font-black text-xl tracking-tight" style={{ color: '#e8f4f8' }}>
            Silent<span style={{ color: '#22d3ee' }}>Speak</span>
          </span>
        </div>
        <div className="font-mono text-xs" style={{ color: '#3a5060' }}>
          SYSTEM READY
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-3 animate-fade-in">
            <span className="font-mono text-xs tracking-widest" style={{ color: '#22d3ee' }}>INPUT</span>
            <div className="h-px flex-1" style={{ background: '#1a2530' }} />
          </div>

          <h2 className="text-4xl font-black mb-2 animate-slide-up" style={{ color: '#e8f4f8' }}>
            Select Input Source
          </h2>
          <p className="text-sm mb-10 animate-slide-up delay-100" style={{ color: '#6b8a9a' }}>
            Choose how you want to feed video into the lip-reading system.
          </p>

          {/* Option cards */}
          <div className="grid gap-4">
            {options.map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => onSelect(opt.id)}
                className={`group text-left p-6 rounded transition-all duration-300 animate-slide-up`}
                style={{
                  background: '#080d12',
                  border: '1px solid #1a2530',
                  animationDelay: `${i * 0.1}s`,
                  animationFillMode: 'both',
                  opacity: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.border = '1px solid #22d3ee40'
                  e.currentTarget.style.boxShadow = '0 0 30px #22d3ee10'
                  e.currentTarget.style.background = '#0c1218'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border = '1px solid #1a2530'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.background = '#080d12'
                }}
              >
                <div className="flex items-start gap-5">
                  {/* Icon */}
                  <div className="flex-shrink-0 p-3 rounded" style={{ background: '#040608', color: '#22d3ee' }}>
                    {opt.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-lg" style={{ color: '#e8f4f8' }}>{opt.label}</span>
                      <span
                        className="font-mono text-xs px-2 py-0.5 rounded"
                        style={{ color: opt.tagColor, background: `${opt.tagColor}15`, border: `1px solid ${opt.tagColor}30` }}
                      >
                        {opt.tag}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: '#6b8a9a' }}>{opt.desc}</p>
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0 self-center transition-transform duration-300 group-hover:translate-x-1" style={{ color: '#3a5060' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
