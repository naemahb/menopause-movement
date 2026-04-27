/**
 * Wealthsimple design tokens
 */

export const tokens = {
  colors: {
    background: '#F5F3EF',
    surface: '#EDEAE3',
    surfaceSage: '#D6DDD0',
    surfaceBlush: '#E8DDD8',
    foreground: '#1A1A1A',
    foregroundMuted: '#6B6B6B',
    accent: '#1A1A1A',
    accentForeground: '#FFFFFF',
    success: '#3D7A5C',
    warning: '#C17F3A',
    destructive: '#B94040',
    border: '#D9D5CE',
  },
  typography: {
    fontSans: "'Inter', system-ui, sans-serif",
    scale: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '24px',
      '2xl': '32px',
      '3xl': '40px',
    },
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
    12: '48px',
  },
  radius: {
    card: '16px',
    pill: '9999px',
    input: '12px',
  },
} as const
