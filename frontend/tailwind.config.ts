/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // ═══════════════════════════════════════════════════════════
        // PRIMARY — Electric Cyan/Teal
        // A sophisticated teal that evokes actual electricity,
        // not just "eco-friendly green." Cool, precise, technological.
        // ═══════════════════════════════════════════════════════════
        primary: {
          50: '#EDFCFD',
          100: '#D2F7FA',
          200: '#A5EEF5',
          300: '#6DE0ED',
          400: '#2EC9DD',
          500: '#14A8C0',   // Main — refined electric teal
          600: '#0E8BA1',
          700: '#116F82',
          800: '#155B6B',
          900: '#164C5A',
          950: '#07313D',
        },
        // ═══════════════════════════════════════════════════════════
        // ACCENT — Warm Amber/Gold
        // Creates temperature contrast with cool primary.
        // Evokes energy, premium quality, automotive luxury.
        // ═══════════════════════════════════════════════════════════
        accent: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',   // Main — warm amber
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          950: '#451A03',
        },
        // ═══════════════════════════════════════════════════════════
        // SURFACE — Rich Slates with subtle blue undertone
        // Warmer than pure gray, carries brand DNA.
        // Dark mode surfaces have depth and character.
        // ═══════════════════════════════════════════════════════════
        surface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          850: '#172033',   // Extra stop for layering
          900: '#0F172A',
          950: '#0B1120',   // Deepest — almost black with blue soul
        },
        // ═══════════════════════════════════════════════════════════
        // SEMANTIC COLORS — Refined, not garish
        // ═══════════════════════════════════════════════════════════
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        info: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
      },
      boxShadow: {
        // ═══════════════════════════════════════════════════════════
        // SHADOWS — Multi-layered for realistic depth
        // Combines ambient occlusion + directional light
        // ═══════════════════════════════════════════════════════════
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'DEFAULT': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        // Card shadows — visible but not heavy
        'card': '0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)',
        'elevated': '0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)',
        // Glow effects — primary color (electric cyan)
        'glow-sm': '0 0 12px rgba(20, 168, 192, 0.25)',
        'glow': '0 0 24px rgba(20, 168, 192, 0.3)',
        'glow-lg': '0 0 48px rgba(20, 168, 192, 0.35)',
        // Accent glow (warm amber)
        'glow-accent': '0 0 24px rgba(245, 158, 11, 0.25)',
        // Inner glow for premium effect
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        // Button shadows
        'btn-primary': '0 4px 14px rgba(20, 168, 192, 0.4)',
        'btn-accent': '0 4px 14px rgba(245, 158, 11, 0.35)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.3s ease-out',
        'fade-out': 'fadeOut 0.3s ease-in forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-out-right': 'slideOutRight 0.3s ease-in forwards',
        'slide-out-down': 'slideOutDown 0.25s ease-in forwards',
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-out': 'scaleOut 0.2s ease-in forwards',
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
        'pulse-soft': 'pulseSoft 2s infinite ease-in-out',
        'spin-slow': 'spin 3s linear infinite',
        'progress': 'progress 1.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'page-enter': 'pageEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'content-reveal': 'contentReveal 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideOutRight: {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(16px)' },
        },
        slideOutDown: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(12px)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(20, 168, 192, 0.4)' },
          '50%': { boxShadow: '0 0 24px rgba(20, 168, 192, 0.7)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pageEnter: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        contentReveal: {
          '0%': { opacity: '0', filter: 'blur(4px)' },
          '100%': { opacity: '1', filter: 'blur(0)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(135deg, var(--tw-gradient-from) 0%, transparent 50%), linear-gradient(225deg, var(--tw-gradient-to) 0%, transparent 50%)',
        // Premium subtle gradients
        'surface-gradient': 'linear-gradient(180deg, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)',
        'glow-gradient': 'radial-gradient(ellipse at center, var(--tw-gradient-from) 0%, transparent 70%)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [
    function({ addUtilities }: any) {
      addUtilities({
        '.glass-bg': {
          background: 'var(--glass-bg)',
        },
        '.glass-border': {
          'border-color': 'var(--glass-border)',
        },
        '.glass-blur': {
          'backdrop-filter': 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
          '-webkit-backdrop-filter': 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
        },
        '.glass-surface': {
          'background': 'var(--glass-bg)',
          'border-color': 'var(--glass-border)',
          'backdrop-filter': 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
          '-webkit-backdrop-filter': 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
        },
      });
    },
  ],
}
