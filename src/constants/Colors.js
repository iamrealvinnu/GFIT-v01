// Brand Colors from Logo
export const BRAND_COLORS = {
  // Primary brand colors from logo
  PURPLE: '#391B58',      // RGB: 57, 27, 88
  YELLOW: '#CFDB27',      // RGB: 207, 219, 37
  
  // Color variations for different use cases
  PURPLE_LIGHT: '#4A2A6B',    // Lighter version of purple
  PURPLE_DARK: '#2D1545',     // Darker version of purple
  YELLOW_LIGHT: '#D8E23A',    // Lighter version of yellow
  YELLOW_DARK: '#B8C420',     // Darker version of yellow
  
  // Transparent versions for overlays and gradients
  PURPLE_TRANSPARENT: 'rgba(57, 27, 88, 0.8)',
  YELLOW_TRANSPARENT: 'rgba(207, 219, 39, 0.8)',
  
  // Additional colors for UI elements
  GREEN: '#4CAF50',       // Success/beginner
  ORANGE: '#FF9800',      // Warning/intermediate
  RED: '#F44336',         // Error/advanced
  
  // Gradient combinations
  BRAND_GRADIENT: ['#391B58', '#CFDB27'],
  PURPLE_GRADIENT: ['#391B58', '#4A2A6B'],
  YELLOW_GRADIENT: ['#CFDB27', '#D8E23A'],
};

// UI Colors
export const UI_COLORS = {
  // Background colors
  BACKGROUND_DARK: '#0a0a0a',
  BACKGROUND_MEDIUM: '#1a1a1a',
  BACKGROUND_LIGHT: '#2a2a2a',
  
  // Text colors
  TEXT_PRIMARY: '#391B58',
  TEXT_SECONDARY: '#391B58',
  TEXT_MUTED: '#391B58',
  
  // Overlay colors
  OVERLAY_DARK: 'rgba(0, 0, 0, 0.5)',
  OVERLAY_LIGHT: 'rgba(255, 255, 255, 0.1)',
  OVERLAY_MEDIUM: 'rgba(255, 255, 255, 0.2)',
  
  // Border colors
  BORDER_LIGHT: 'rgba(255, 255, 255, 0.1)',
  BORDER_MEDIUM: 'rgba(255, 255, 255, 0.2)',
};

// Status Colors
export const STATUS_COLORS = {
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  INFO: '#2196F3',
};

export default {
  ...BRAND_COLORS,
  ...UI_COLORS,
  ...STATUS_COLORS,
};
