import * as THREE from 'three';
import { Room } from '../types';
import { MATERIALS, GLASS_WALLED_ROOMS, FLOOR_HEIGHT } from '../build_config';

export const createMaterialMode = (
  room: Room,
  floorHeight: number,
  geometry: THREE.ExtrudeGeometry,
  roomId: string,
  labelPosition: THREE.Vector3,
  floorNum: number
): THREE.Mesh => {
  const isGlassWalled = GLASS_WALLED_ROOMS.includes(room.room_type.toLowerCase());
  
  const materialMesh = new THREE.Mesh(
    geometry,
    isGlassWalled ? [MATERIALS.concrete.clone(), MATERIALS.glass.clone(), MATERIALS.concrete.clone()] 
                  : MATERIALS.concrete.clone()
  );
  
  materialMesh.rotation.x = Math.PI / 2;
  materialMesh.position.set(0, floorHeight, 0);
  materialMesh.userData = {
    roomData: room,
    layerType: 'material',
    roomId,
    labelPosition: labelPosition.clone(),
    floorNum
  };
  
  // Store original properties for hover effect
  if (isGlassWalled) {
    const materials = materialMesh.material as THREE.Material[];
    materials.forEach(material => {
      if (material instanceof THREE.MeshPhysicalMaterial) {
        material.userData = {
          originalEmissive: material.emissive.clone()
        };
      }
    });
  } else {
    const material = materialMesh.material as THREE.Material;
    material.userData = {
      originalEmissive: (material as THREE.MeshPhysicalMaterial).emissive.clone()
    };
  }
  
  return materialMesh;
};