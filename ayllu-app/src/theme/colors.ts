// Civic Horizon Design System Tokens
export const Colors = {
  // Primary Authoritative Cobalt
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#dbeafe',
  primaryContainer: '#eff6ff',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#1e40af',

  // Secondary Deep Slate Navy
  secondary: '#0f172a',
  secondaryLight: '#1e293b',
  secondaryMuted: '#475569',
  slateDim: '#64748b',
  secondaryContainer: '#e2e8f0',
  onSecondary: '#ffffff',

  // Tertiary Terracotta / Civic Alert / Emergency
  tertiary: '#ea580c',
  emergency: '#dc2626',
  emergencyDark: '#991b1b',
  emergencyLight: '#fee2e2',
  emergencyContainer: '#ffdada',
  onEmergency: '#ffffff',

  // Surfaces & Backgrounds
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceSubtle: '#f1f5f9',
  surfaceContainerLow: '#f8fafc',
  surfaceContainer: '#e2e8f0',
  surfaceContainerHigh: '#cbd5e1',
  
  // Borders & Outlines
  border: '#e2e8f0',
  borderDark: '#cbd5e1',
  outline: '#94a3b8',
  
  // States & Badges
  success: '#16a34a',
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  warningText: '#92400e',
  info: '#0284c7',
  infoLight: '#e0f2fe',
};

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modal: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
};

export const Typography = {
  fontFamilyDisplay: 'System',
  fontFamilyBody: 'System',
  fontSize: {
    xs: 10.5,
    sm: 12,
    md: 13.5,
    base: 14.5,
    lg: 16,
    xl: 18,
    xxl: 22,
    display: 26,
  },
};
