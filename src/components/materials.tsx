// materials.ts
import * as THREE from 'three';

export interface MaterialConfig {
  color: number;
  transparent?: boolean;
  opacity?: number;
  metalness?: number;
  roughness?: number;
  transmission?: number;
  thickness?: number;
  envMapIntensity?: number;
  side?: THREE.Side;
}

export const buildingMaterials: Record<string, MaterialConfig> = {
  'Office': {
    color: 0x88CCFF,
    transparent: true,
    opacity: 0.3,
    metalness: 0.9,
    roughness: 0.1,
    transmission: 0.5,
    thickness: 0.5,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide
  },
  'Office_Floor': {
    color: 0xCCCCCC,
    metalness: 0.1,
    roughness: 0.8
  },
  'Concrete': {
    color: 0xE0E0E0,
    metalness: 0.1,
    roughness: 0.9
  }
};

export const roomMaterialMapping: Record<string, keyof typeof buildingMaterials> = {
  'Office': 'Office',
  'Entry Lobby': 'Office',
  'Kitchen': 'Concrete',
  'Restroom': 'Concrete',
  'Elevator Shaft': 'Concrete',
  'Stairway': 'Concrete',
  'Corridor & Elevator Lobby': 'Concrete',
  'Mechanical Shaft': 'Concrete',
  'Electrical Room': 'Concrete'
};