/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        deep:    '#0b0f17',
        card:    '#0d1421',
        panel:   '#111827',
        surface: '#131c2e',
        cyber: {
          DEFAULT: '#00d4ff',
          soft:    '#7df9ff',
          dim:     '#00d4ff60',
          glow:    '#00d4ff20',
        },
        border: {
          DEFAULT: '#1e2d3d',
          bright:  '#00d4ff30',
        },
        ink: {
          primary:   '#e6f1ff',
          secondary: '#8892a4',
          muted:     '#4a5568',
        },
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          danger:  '#ef4444',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Syne', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse 80% 60% at 50% 0%, #00d4ff0d, transparent 70%)',
        'card-gradient': 'linear-gradient(135deg, #0d1421, #111827)',
        'cyber-gradient': 'linear-gradient(135deg, #00d4ff, #7df9ff)',
      },
      boxShadow: {
        'cyber':       '0 0 16px #00d4ff18, 0 0 48px #00d4ff0a',
        'cyber-strong':'0 0 24px #00d4ff30, 0 0 80px #00d4ff15',
        'card':        '0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'scan':         'scan 5s linear infinite',
        'pulse-slow':   'pulse 3s ease-in-out infinite',
        'pulse-glow':   'pulseGlow 2.5s ease-in-out infinite',
        'flicker':      'flicker 0.15s infinite',
        'fade-in':      'fadeIn 0.5s ease forwards',
        'slide-up':     'slideUp 0.5s ease forwards',
        'slide-down':   'slideDown 0.4s ease forwards',
        'orbit':        'orbitRing 8s linear infinite',
        'orbit-reverse':'orbitRingReverse 6s linear infinite',
        'spin-slow':    'spin 3s linear infinite',
        'blink':        'blink 1s step-end infinite',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%, 100%': { opacity: 1 },
          '50%':      { opacity: 0.85 },
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
          '0%, 100%': { boxShadow: '0 0 16px #00d4ff18' },
          '50%':      { boxShadow: '0 0 36px #00d4ff35, 0 0 72px #00d4ff15' },
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
        'modal': '600px',
      },
      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.5rem',
      },
      transitionDuration: {
        '400': '400ms',
      },
    },
  },
  plugins: [],
}