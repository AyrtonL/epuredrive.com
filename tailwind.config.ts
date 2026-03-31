import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#040404',
        surface: '#0d0d0d',
        surfaceHover: '#161616',
        surfaceBorder: 'rgba(255, 255, 255, 0.08)',
        primary: '#ffffff',
        accent: '#f0f0f0',
        muted: '#A1A1AA',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'hero-glow': 'radial-gradient(50% 50% at 50% 50%, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.7s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(15px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { textShadow: '0 0 10px rgba(255,255,255,0.1)' },
          '100%': { textShadow: '0 0 20px rgba(255,255,255,0.4), 0 0 30px rgba(255,255,255,0.2)' },
        }
      }
    },
  },
  plugins: [],
}

export default config
