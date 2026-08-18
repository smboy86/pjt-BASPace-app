module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F3F6FA',
          100: '#E8EEF6',
          200: '#D4DFEC',
          700: '#163A63',
          800: '#102E50',
          900: '#0B1F3A',
        },
        sand: {
          50: '#F7F8FA',
        },
        stone: {
          50: '#F0F3F7',
          100: '#D8E1EC',
        },
        ink: {
          500: '#667085',
          600: '#667085',
          900: '#0B1F3A',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['System', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
