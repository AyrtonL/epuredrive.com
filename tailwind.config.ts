import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // éPure Drive brand palette (per brand guidelines)
        background: '#000000',
        surface: '#2B2B2B',
        surfaceHover: '#3A3A3A',
        surfaceBorder: 'rgba(255, 255, 255, 0.13)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        muted: '#ACACAC',
        // Brand gray scale
        charcoal: '#565656',
        grey: '#818181',
        silver: '#ACACAC',
        dustGrey: '#D7D7D7',
        gray1: '#565656',
        gray2: '#818181',
        gray3: '#ACACAC',
        gray4: '#D7D7D7',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0.04) 100%)',
        'hero-glow': 'radial-gradient(50% 50% at 50% 50%, rgba(255, 255, 255, 0.09) 0%, rgba(0, 0, 0, 0) 100%)',
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
