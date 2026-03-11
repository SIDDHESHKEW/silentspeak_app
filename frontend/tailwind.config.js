/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        deep:    '#111827',
        card:    '#1f2937',
        panel:   '#1f2937',
        surface: '#374151',
        accent: {
          DEFAULT: '#3b82f6',
          soft:    '#38bdf8',
          green:   '#22c55e',
          dim:     '#3b82f660',
          glow:    '#3b82f615',
        },
        border: {
          DEFAULT: '#374151',
          bright:  '#3b82f625',
        },
        ink: {
          primary:   '#f9fafb',
          secondary: '#9ca3af',
          muted:     '#6b7280',
        },
        status: {
          success: '#22c55e',
          warning: '#f59e0b',
          danger:  '#ef4444',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Syne', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient':  'radial-gradient(ellipse 80% 50% at 50% 0%, #3b82f60a, transparent 70%)',
        'card-gradient':  'linear-gradient(135deg, #1f2937, #374151)',
        'accent-gradient':'linear-gradient(135deg, #3b82f6, #38bdf8)',
      },
      boxShadow: {
        'accent':        '0 0 12px #3b82f612, 0 0 32px #3b82f608',
        'accent-strong': '0 0 20px #3b82f622, 0 0 60px #3b82f610',
        'card':          '0 4px 24px rgba(0,0,0,0.35)',
      },
      animation: {
        'scan':          'scan 6s linear infinite',
        'pulse-slow':    'pulse 3s ease-in-out infinite',
        'pulse-glow':    'pulseGlow 2.5s ease-in-out infinite',
        'flicker':       'flicker 0.15s infinite',
        'fade-in':       'fadeIn 0.5s ease forwards',
        'slide-up':      'slideUp 0.5s ease forwards',
        'slide-down':    'slideDown 0.4s ease forwards',
        'orbit':         'orbitRing 8s linear infinite',
        'orbit-reverse': 'orbitRingReverse 6s linear infinite',
        'spin-slow':     'spin 3s linear infinite',
        'blink':         'blink 1s step-end infinite',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%, 100%': { opacity: 1 },
          '50%':      { opacity: 0.88 },
        },
        fadeIn: {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: 0, transform: 'translateY(-12px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 12px #3b82f612' },
          '50%':      { boxShadow: '0 0 28px #3b82f628, 0 0 56px #3b82f610' },
        },
        orbitRing: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        orbitRingReverse: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(-360deg)' },
        },
        blink: {
          '0%, 100%': { opacity: 1 },
          '50%':      { opacity: 0 },
        },
      },
      maxWidth: {
        modal: '600px',
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.5rem',
      },
      transitionDuration: {
        400: '400ms',
      },
    },
  },
  plugins: [],
}