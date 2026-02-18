import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
    extend: {
      colors: {
        // ── Core surfaces ──
        midnight: '#0a0f16',
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.035)',
          raised: 'rgba(255, 255, 255, 0.06)',
          inset: 'rgba(0, 0, 0, 0.2)',
          hover: 'rgba(255, 255, 255, 0.08)',
        },
        // ── Accent palette ──
        emerald: {
          DEFAULT: '#10B981',
          dim: 'rgba(16, 185, 129, 0.14)',
          glow: 'rgba(16, 185, 129, 0.25)',
        },
        amber: {
          DEFAULT: '#F59E0B',
          dim: 'rgba(245, 158, 11, 0.10)',
        },
        cyan: {
          DEFAULT: '#14B8A6',
          dim: 'rgba(20, 184, 166, 0.10)',
        },
        rose: {
          DEFAULT: '#EF4444',
          dim: 'rgba(239, 68, 68, 0.10)',
        },
        blue: {
          DEFAULT: '#3B82F6',
          dim: 'rgba(59, 130, 246, 0.10)',
        },
        // ── Text hierarchy ──
        label: 'rgba(148, 163, 184, 1)',       // slate-400
        muted: 'rgba(100, 116, 139, 1)',        // slate-500
        faint: 'rgba(71, 85, 105, 1)',          // slate-600
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255,255,255,0.04)',
        'card-hover': '0 16px 56px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255,255,255,0.06)',
        'glow-emerald': '0 0 30px rgba(16, 185, 129, 0.25), 0 0 60px rgba(16, 185, 129, 0.08)',
        'glow-emerald-lg': '0 0 50px rgba(16, 185, 129, 0.35), 0 0 100px rgba(16, 185, 129, 0.12)',
        'glow-amber': '0 0 30px rgba(245, 158, 11, 0.25), 0 0 60px rgba(245, 158, 11, 0.08)',
        'glow-amber-top': 'inset 0 1px 0 0 rgba(245, 158, 11, 0.5), 0 0 30px rgba(245, 158, 11, 0.2)',
        'glow-cyan': '0 0 30px rgba(20, 184, 166, 0.25), 0 0 60px rgba(20, 184, 166, 0.08)',
        'glow-rose': '0 0 30px rgba(239, 68, 68, 0.25), 0 0 60px rgba(239, 68, 68, 0.08)',
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.03) 0%, transparent 60%)',
        'radial-center': 'radial-gradient(circle at 50% 50%, rgba(16,185,129,0.02) 0%, transparent 50%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'charge-pulse': 'charge-pulse 1.5s ease-out infinite',
        'dash-flow': 'dash-flow 1s linear infinite',
        shimmer: 'shimmer 2s linear infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
        'charge-pulse': {
          '0%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)' },
          '70%': { boxShadow: '0 0 0 12px rgba(16, 185, 129, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
        },
        'dash-flow': {
          to: { strokeDashoffset: '-24' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      // ── Bento grid column span shortcuts ──
      gridColumn: {
        'span-full': '1 / -1',
      },
    },
  },
  plugins: [
    // Bento card utility classes
    plugin(({ addUtilities }) => {
      addUtilities({
        '.glass': {
          backgroundColor: 'rgba(255, 255, 255, 0.035)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '1rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255,255,255,0.04)',
        },
        '.glass-hover': {
          transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            backgroundColor: 'rgba(255, 255, 255, 0.055)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
            boxShadow: '0 0 35px rgba(16, 185, 129, 0.25), 0 16px 56px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255,255,255,0.06)',
          },
        },
      });
    }),
  ],
};

export default config;
