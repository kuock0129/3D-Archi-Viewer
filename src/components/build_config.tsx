import * as THREE from 'three';

export const FLOOR_HEIGHT = 10;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Room type colors for the color box mode
export const ROOM_COLORS: Record<string, number> = {
  'Office': 0x87CEEB,
  'Kitchen': 0xFFA07A,
  'Restroom': 0x98FB98,
  'Elevator Shaft': 0xDDA0DD,
  'Stairway': 0xF0E68C,
  'Corridor & Elevator Lobby': 0xFFE4E1,
  'Mechanical Shaft': 0xB8860B,
  'Electrical Room': 0xCD853F,
  'Entry Lobby': 0xADD8E6
};

// Material definitions
export const MATERIALS = {
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    metalness: 0.1,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide
  }),

  concrete: new THREE.MeshPhysicalMaterial({
    color: 0xcccccc,
    metalness: 0.1,
    roughness: 0.8,
    side: THREE.DoubleSide
  }),

  wireframe: new THREE.MeshBasicMaterial({
    color: 0x000000,
    wireframe: true,
    transparent: true,
    opacity: 0.1,
  })
};

// Room types that should use glass walls
export const GLASS_WALLED_ROOMS = [
  'office',
  'entry lobby'
];

// Label styles
export const LABEL_STYLES = {
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  color: 'white',
  padding: '6px 10px',
  borderRadius: '4px',
  fontSize: '12px',
  pointerEvents: 'none',
  whiteSpace: 'pre-line',
  transition: 'opacity 0.2s'
};

// Camera settings
export const CAMERA_CONFIG = {
  fov: 75,
  near: 0.1,
  far: 1000,
  initialPositionMultiplier: {
    x: 1.5,
    y: 1.2,
    z: 1.5
  }
};

// Lighting settings
export const LIGHTING_CONFIG = {
  ambient: {
    color: 0xffffff,
    intensity: 0.5
  },
  directional: {
    color: 0xffffff,
    intensity: 0.5,
    position: {
      x: 5,
      y: 100,
      z: 50
    }
  }
};

// Hover effect settings
export const HOVER_EFFECTS = {
  colorBox: {
    opacity: 1.0,
    emissiveColor: 0x222222
  },
  material: {
    emissiveColor: 0x222222
  },
  wireframe: {
    opacity: 0.5
  }
};