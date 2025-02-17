// colorBoxMode.tsx
import * as THREE from 'three';
import { Room } from '../types';
import { ROOM_COLORS, FLOOR_HEIGHT, HOVER_EFFECTS } from '../build_config';

export const createColorBoxMode = (
  room: Room,
  floorHeight: number,
  geometry: THREE.ExtrudeGeometry,
  roomId: string,
  labelPosition: THREE.Vector3,
  floorNum: number
): THREE.Mesh => {
  const colorMaterial = new THREE.MeshPhongMaterial({ 
    color: ROOM_COLORS[room.room_type] || 0x808080,
    transparent: true,
    opacity: 0.5
  });
  
  const colorMesh = new THREE.Mesh(geometry, colorMaterial);
  colorMesh.rotation.x = Math.PI / 2;
  colorMesh.position.set(0, floorHeight, 0);
  colorMesh.userData = {
    roomData: room,
    layerType: 'color',
    originalOpacity: 0.5,
    roomId,
    labelPosition: labelPosition.clone(),
    floorNum
  };
  
  colorMaterial.userData = {
    originalEmissive: colorMaterial.emissive.clone()
  };
  
  return colorMesh;
};