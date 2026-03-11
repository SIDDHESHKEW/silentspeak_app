export default function ResearchNotice({ inputType, onContinue, onCancel }) {
  const examples = [
    'bin blue at f two now',
    'bin blue at s one soon',
    'bin blue at m two please',
    'bin blue at z four now',
  ]

  const blueprint = ['command', 'color', 'preposition', 'letter', 'digit', 'adverb']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#040608e0', backdropFilter: 'blur(8px)' }}>
      <div
        className="relative max-w-xl w-full animate-slide-up"
        style={{
          background: 'linear-gradient(135deg, #080d12 0%, #0c1218 100%)',
          border: '1px solid #1a2530',
          borderRadius: '2px',
          boxShadow: '0 0 60px #f59e0b10, 0 40px 80px #00000080',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Top accent - amber for warning */}
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }} />

        {/* Corner markers */}
        <div className="absolute top-3 left-3 w-3 h-3 border-t border-l" style={{ borderColor: '#f59e0b' }} />
        <div className="absolute top-3 right-3 w-3 h-3 border-t border-r" style={{ borderColor: '#f59e0b' }} />

        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded" style={{ background: '#f59e0b15' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" className="w-5 h-5">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <div className="font-mono text-xs tracking-widest mb-0.5" style={{ color: '#f59e0b' }}>RESEARCH NOTICE</div>
              <h3 className="font-black text-xl" style={{ color: '#e8f4f8' }}>Experimental Feature</h3>
            </div>
          </div>

          <div className="h-px mb-6" style={{ background: 'linear-gradient(90deg, #f59e0b30, transparent)' }} />

          {/* Warning text */}
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#6b8a9a' }}>
            {inputType === 'upload' ? 'Video upload' : 'Live webcam'} input is experimental. This system was trained exclusively on the{' '}
            <span className="font-mono text-xs px-1 py-0.5 rounded" style={{ color: '#22d3ee', background: '#22d3ee15' }}>GRID corpus</span>
            {' '}— structured command sentences spoken in a controlled environment.
          </p>

          <p className="text-sm leading-relaxed mb-6" style={{ color: '#6b8a9a' }}>
            For best results, your spoken command should follow this structure:
          </p>

          {/* Command blueprint */}
          <div className="mb-6">
            <div className="font-mono text-xs mb-3" style={{ color: '#3a5060' }}>COMMAND STRUCTURE</div>
            <div className="flex flex-wrap gap-2">
              {blueprint.map((word, i) => (
                <div key={word} className="flex items-center gap-2">
                  <span
                    className="font-mono text-xs px-3 py-1.5 rounded"
                    style={{ background: '#040608', border: '1px solid #22d3ee30', color: '#22d3ee' }}
                  >
                    {word}
                  </span>
                  {i < blueprint.length - 1 && (
                    <span style={{ color: '#3a5060' }}>→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Example commands */}
          <div className="mb-8">
            <div className="font-mono text-xs mb-3" style={{ color: '#3a5060' }}>EXAMPLE COMMANDS</div>
            <div className="space-y-2">
              {examples.map((ex, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded"
                  style={{ background: '#040608', border: '1px solid #1a2530' }}
                >
                  <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
                  <span className="font-mono text-xs" style={{ color: '#6b8a9a' }}>{ex}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 font-bold text-sm tracking-wider rounded transition-all duration-200"
              style={{
                background: 'transparent',
                border: '1px solid #1a2530',
                color: '#6b8a9a',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a5060'; e.currentTarget.style.color = '#e8f4f8' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a2530'; e.currentTarget.style.color = '#6b8a9a' }}
            >
              Cancel
            </button>
            <button
              onClick={onContinue}
              className="flex-1 py-3 font-bold text-sm tracking-wider rounded transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #f59e0b20, #f59e0b30)',
                border: '1px solid #f59e0b50',
                color: '#f59e0b',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 20px #f59e0b20' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              Continue Anyway →
            </button>
          </div>
        </div>

        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #f59e0b40, transparent)' }} />
      </div>
    </div>
  )
}
