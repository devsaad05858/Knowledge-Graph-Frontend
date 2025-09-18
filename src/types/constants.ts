// Node type colors mapping
export const NODE_TYPE_COLORS: Record<string, string> = {
  'frontend-framework': '#3b82f6', // blue
  'backend-framework': '#10b981', // emerald
  'programming-language': '#f59e0b', // amber
  'database': '#ef4444', // red
  'runtime': '#8b5cf6', // violet
  'visualization-library': '#06b6d4', // cyan
  'component': '#84cc16', // lime
  'architecture': '#f97316', // orange
  'concept': '#ec4899', // pink
  'css-framework': '#14b8a6', // teal
  'build-tool': '#6366f1', // indigo
  'cloud-database': '#f97316', // orange
  'orm': '#a855f7', // purple
  'graph-database': '#dc2626', // red-600
  'default': '#6b7280' // gray
};

// Physics simulation constants - tuned for better stability
export const PHYSICS_CONFIG = {
  CHARGE_STRENGTH: -400,      // Increased repulsion for better separation
  LINK_DISTANCE: 100,         // Slightly longer links for better readability
  COLLISION_RADIUS: 25,       // Larger collision radius to prevent overlap
  ALPHA_DECAY: 0.015,         // Slower decay for more stable settling
  VELOCITY_DECAY: 0.4,        // Higher drag to reduce oscillation
  ALPHA_TARGET: 0.05,         // Minimum energy level before simulation stops
  REHEAT_STRENGTH: 0.2        // Gentle reheat for smooth transitions
} as const; 