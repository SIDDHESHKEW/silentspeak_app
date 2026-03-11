export default function ResearchNotice({ inputType, onContinue, onCancel }) {
  const examples = [
    'bin blue at f two now',
    'lay red by s one soon',
    'place green in m four please',
  ]

  const blueprint = ['command', 'color', 'preposition', 'letter', 'digit', 'adverb']

  return (
    <div className="modal-backdrop animate-fade-in"
      style={{ background: 'rgba(10, 14, 23, 0.90)' }}>
      <div
        className="relative w-full animate-slide-up"
        style={{
          maxWidth:     '580px',
          maxHeight:    '90vh',
          overflowY:    'auto',
          background:   'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
          border:       '1px solid #374151',
          borderRadius: '8px',
          boxShadow:    '0 0 48px #f59e0b0a, 0 32px 64px #00000090',
        }}
      >
        {/* Top accent — amber */}
        <div className="h-px w-full"
          style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }} />

        {/* Corner markers */}
        <div className="absolute top-3 left-3 w-3 h-3 border-t border-l pointer-events-none"
          style={{ borderColor: '#f59e0b' }} />
        <div className="absolute top-3 right-3 w-3 h-3 border-t border-r pointer-events-none"
          style={{ borderColor: '#f59e0b' }} />
        <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l pointer-events-none"
          style={{ borderColor: '#f59e0b' }} />
        <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r pointer-events-none"
          style={{ borderColor: '#f59e0b' }} />

        <div className="p-7 sm:p-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg flex-shrink-0"
              style={{ background: '#f59e0b10', border: '1px solid #f59e0b22' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b"
                strokeWidth="1.5" className="w-5 h-5">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9"  x2="12"    y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <div className="font-mono text-xs tracking-widest mb-0.5" style={{ color: '#f59e0b' }}>
                RESEARCH NOTICE
              </div>
              <h3 className="font-black text-xl" style={{ color: '#f9fafb' }}>
                Experimental Feature
              </h3>
            </div>
          </div>

          <div className="h-px mb-6"
            style={{ background: 'linear-gradient(90deg, #f59e0b28, transparent)' }} />

          <p className="text-sm leading-relaxed mb-4" style={{ color: '#9ca3af' }}>
            {inputType === 'upload' ? 'Video upload' : 'Live webcam'} input is experimental.
            This system was trained exclusively on the{' '}
            <span className="font-mono text-xs px-1.5 py-0.5 rounded"
              style={{ color: '#38bdf8', background: '#38bdf810', border: '1px solid #38bdf820' }}>
              GRID corpus
            </span>
            {' '}— structured command sentences spoken in a controlled environment.
          </p>

          <p className="text-sm leading-relaxed mb-6" style={{ color: '#9ca3af' }}>
            For best results, your spoken command must follow this exact structure:
          </p>

          {/* Blueprint */}
          <div className="mb-6">
            <div className="font-mono text-xs mb-3" style={{ color: '#6b7280' }}>
              COMMAND STRUCTURE
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {blueprint.map((word, i) => (
                <div key={word} className="flex items-center gap-2">
                  <span className="font-mono text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: '#111827', border: '1px solid #3b82f625', color: '#3b82f6' }}>
                    {word}
                  </span>
                  {i < blueprint.length - 1 && (
                    <span style={{ color: '#374151' }}>→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Examples */}
          <div className="mb-8">
            <div className="font-mono text-xs mb-3" style={{ color: '#6b7280' }}>
              EXAMPLE COMMANDS
            </div>
            <div className="space-y-2">
              {examples.map((ex, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: '#111827', border: '1px solid #374151' }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: '#3b82f6', opacity: 0.6 }} />
                  <span className="font-mono text-xs prediction-text"
                    style={{ color: '#9ca3af' }}>{ex}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 font-bold text-sm tracking-wider rounded-lg transition-all duration-200"
              style={{ background: 'transparent', border: '1px solid #374151', color: '#9ca3af' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#6b7280'; e.currentTarget.style.color = '#f9fafb' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#9ca3af' }}
            >Cancel</button>
            <button
              onClick={onContinue}
              className="flex-1 py-3 font-bold text-sm tracking-wider rounded-lg transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #f59e0b15, #f59e0b25)', border: '1px solid #f59e0b45', color: '#f59e0b' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 16px #f59e0b15'; e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b22, #f59e0b35)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b15, #f59e0b25)' }}
            >Continue Anyway →</button>
          </div>

        </div>

        <div className="h-px w-full"
          style={{ background: 'linear-gradient(90deg, transparent, #f59e0b38, transparent)' }} />
      </div>
    </div>
  )
}