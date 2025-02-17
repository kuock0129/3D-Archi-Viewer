import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { HOVER_EFFECTS } from '../build_config';

export interface HoveredObjects {
  color: THREE.Mesh | null;
  material: THREE.Mesh | null;
  wireframe: THREE.Mesh | null;
}

export const resetHoverEffects = (
  hoveredObjects: HoveredObjects,
  scene: THREE.Scene
) => {
  if (hoveredObjects.color) {
    const material = hoveredObjects.color.material as THREE.MeshPhongMaterial;
    material.opacity = hoveredObjects.color.userData.originalOpacity;
    material.emissive.copy(material.userData.originalEmissive);
    hoveredObjects.color = null;
  }
  
  if (hoveredObjects.material) {
    const materials = Array.isArray(hoveredObjects.material.material) 
      ? hoveredObjects.material.material 
      : [hoveredObjects.material.material];
    
    materials.forEach(mat => {
      if (mat instanceof THREE.MeshPhysicalMaterial && mat.userData.originalEmissive) {
        mat.emissive.copy(mat.userData.originalEmissive);
      }
    });
    
    hoveredObjects.material = null;
  }
  
  if (hoveredObjects.wireframe) {
    const material = hoveredObjects.wireframe.material as THREE.MeshBasicMaterial;
    material.opacity = material.userData.originalOpacity;
    hoveredObjects.wireframe = null;
  }
  
  scene.traverse((object) => {
    if (object instanceof CSS2DObject) {
      const domElement = object.userData.domElement as HTMLDivElement;
      domElement.style.opacity = '0';
    }
  });
};






export const applyHoverEffects = (
  roomId: string,
  scene: THREE.Scene,
  hoveredObjects: HoveredObjects
) => {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.userData.roomId === roomId) {
      const layerType = object.userData.layerType;
      
      if (layerType === 'color') {
        const material = object.material as THREE.MeshPhongMaterial;
        material.opacity = HOVER_EFFECTS.colorBox.opacity;
        material.emissive.set(HOVER_EFFECTS.colorBox.emissiveColor);
        hoveredObjects.color = object;
      } 
      else if (layerType === 'material') {
        const materials = Array.isArray(object.material) 
          ? object.material 
          : [object.material];
        
        materials.forEach(mat => {
          if (mat instanceof THREE.MeshPhysicalMaterial) {
            mat.emissive.set(HOVER_EFFECTS.material.emissiveColor);
          }
        });
        
        hoveredObjects.material = object;
      }
      else if (layerType === 'wireframe') {
        const material = object.material as THREE.MeshBasicMaterial;
        material.opacity = HOVER_EFFECTS.wireframe.opacity;
        hoveredObjects.wireframe = object;
      }
    }
    
    if (object instanceof CSS2DObject && object.userData.roomId === roomId) {
      const domElement = object.userData.domElement as HTMLDivElement;
      domElement.style.opacity = '1';
    }
  });
};