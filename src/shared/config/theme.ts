export const Colors = {
  background: {
    primary: '#F7F8FA',
    secondary: '#FFFFFF',
    tertiary: '#E8EEF6',
  },

  primary: {
    DEFAULT: '#163A63',
    light: '#E8EEF6',
    dark: '#0B1F3A',
    gradient: ['#163A63', '#274F7A'],
  },

  accent: {
    gold: '#B86C22',
    lightGold: '#F7E7D3',
    darkGold: '#8A4A12',
  },

  text: {
    primary: '#0B1F3A',
    secondary: '#667085',
    tertiary: '#667085',
    muted: '#667085',
  },

  surface: {
    card: '#FFFFFF',
    cardHover: '#F3F6FA',
    glass: '#FFFFFF',
    glassBorder: '#D8E1EC',
  },

  status: {
    success: '#277A57',
    warning: '#B86C22',
    error: '#B7433D',
    info: '#163A63',
  },

  gradients: {
    primary: ['#163A63', '#274F7A'],
    gold: ['#C37B35', '#B86C22'],
    success: ['#3A8B66', '#277A57'],
  },
};

export const Typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  fontWeights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const GlassmorphismStyle = {
  backgroundColor: 'rgba(26, 26, 26, 0.7)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  ...Shadows.md,
};
