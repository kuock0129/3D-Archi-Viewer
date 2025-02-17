// wireframeMode.tsx
import * as THREE from 'three';
import { Room } from '../types';
import { MATERIALS, FLOOR_HEIGHT } from '../build_config';

export const createWireframeMode = (
  room: Room,
  floorHeight: number,
  geometry: THREE.ExtrudeGeometry,
  roomId: string,
  labelPosition: THREE.Vector3,
  floorNum: number
): THREE.Mesh => {
  const wireframeMaterialClone = MATERIALS.wireframe.clone();
  wireframeMaterialClone.userData = {
    originalOpacity: 0.1
  };
  
  const wireframeMesh = new THREE.Mesh(geometry.clone(), wireframeMaterialClone);
  wireframeMesh.rotation.x = Math.PI / 2;
  wireframeMesh.position.set(0, floorHeight, 0);
  wireframeMesh.userData = {
    roomData: room,
    layerType: 'wireframe',
    roomId,
    labelPosition: labelPosition.clone(),
    floorNum
  };
  
  return wireframeMesh;
};