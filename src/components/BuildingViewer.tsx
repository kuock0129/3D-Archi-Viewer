"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { Upload } from 'lucide-react';
import type { BuildingData, Room } from './types';

const BuildingViewer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showMaterialMode, setShowMaterialMode] = useState(true);
  const [showColorBox, setShowColorBox] = useState(true);
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
  const [error, setError] = useState('');
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredRoom, setHoveredRoom] = useState<Room | null>(null);
  
  // Track hovered objects for each layer
  const hoveredObjectsRef = useRef<{
    color: THREE.Mesh | null,
    material: THREE.Mesh | null,
    wireframe: THREE.Mesh | null
  }>({
    color: null,
    material: null,
    wireframe: null
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const result = e.target?.result;
        if (typeof result === 'string') {
          const data = JSON.parse(result) as BuildingData;
          setBuildingData(data);
          setError('');
        }
      } catch (err) {
        setError('Invalid JSON file format');
        console.error('Error parsing JSON:', err);
      }
    };
    reader.onerror = () => {
      setError('Error reading file');
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (!buildingData || !mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(800, 600);
    renderer.setClearColor(0xf0f0f0);
    mountRef.current.appendChild(renderer.domElement);

    // Create CSS2D renderer for labels
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(800, 600);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    mountRef.current.appendChild(labelRenderer.domElement);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(50, 50, 50);
    scene.add(ambientLight);
    scene.add(directionalLight);

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Calculate building bounds
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    buildingData.forEach(floor => {
      floor.rooms.forEach(room => {
        room.room_shape.coords.forEach(([x, z]) => {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
        });
      });
    });

    const centerX = (maxX + minX) / 2;
    const centerZ = (maxZ + minZ) / 2;

    // Create materials
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      metalness: 0.1,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide
    });

    const concreteMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xcccccc,
      metalness: 0.1,
      roughness: 0.8,
      side: THREE.DoubleSide
    });

    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });

    // Create room label
    const createRoomLabel = (room: Room, position: THREE.Vector3, floorNum: number): CSS2DObject => {
      const div = document.createElement('div');
      div.className = 'label';
      div.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      div.style.color = 'white';
      div.style.padding = '6px 10px';
      div.style.borderRadius = '4px';
      div.style.fontSize = '12px';
      div.style.pointerEvents = 'none';
      div.style.whiteSpace = 'pre-line';
      div.style.transition = 'opacity 0.2s';
      div.style.opacity = '0'; // Start hidden
      
      const content = [
        `Type: ${room.room_type}`,
        `Floor: ${floorNum}`,
        room.room_id ? `ID: ${room.room_id}` : '',
        room.room_name ? `Name: ${room.room_name}` : ''
      ].filter(Boolean).join('\n');
      
      div.textContent = content;
      div.id = `label-${room.room_id || Math.random().toString(36).substring(2, 10)}`;
      
      const label = new CSS2DObject(div);
      label.position.copy(position);
      label.userData.domElement = div;
      label.userData.roomData = room;
      return label;
    };

    const roomColors: Record<string, number> = {
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

    const createRoom = (room: Room, floorHeight: number, floorNum: number): THREE.Group => {
      const group = new THREE.Group();
      
      // Create room shape
      const shape = new THREE.Shape();
      const coords = room.room_shape.coords.map(([x, z]) => [-1 * (x - centerX), z - centerZ]);
      
      shape.moveTo(coords[0][0], coords[0][1]);
      for (let i = 1; i < coords.length; i++) {
        shape.lineTo(coords[i][0], coords[i][1]);
      }

      const height = 10;
      const extrudeSettings = {
        steps: 1,
        depth: height,
        bevelEnabled: false
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
      // Calculate center position for the label
      const avgX = coords.reduce((sum, [x]) => sum + x, 0) / coords.length;
      const avgZ = coords.reduce((sum, [, z]) => sum + z, 0) / coords.length;
      const labelPosition = new THREE.Vector3(avgX, floorHeight + height/2, avgZ);
      
      // Generate unique room ID if not present
      const roomId = room.room_id || `room-${Math.random().toString(36).substring(2, 10)}`;

      // Create material layer if enabled
      if (showMaterialMode) {
        const isGlassWalled = room.room_type.toLowerCase() === 'office' || 
                             room.room_type.toLowerCase() === 'entry lobby';
        
        const materialMesh = new THREE.Mesh(
          geometry,
          isGlassWalled ? [concreteMaterial, glassMaterial, concreteMaterial] : concreteMaterial.clone()
        );
        
        materialMesh.rotation.x = Math.PI / 2;
        materialMesh.position.set(0, floorHeight, 0);
        materialMesh.userData.roomData = room;
        materialMesh.userData.layerType = 'material';
        materialMesh.userData.roomId = roomId;
        materialMesh.userData.labelPosition = labelPosition.clone();
        materialMesh.userData.floorNum = floorNum;
        
        // Store original properties for hover effect
        if (isGlassWalled) {
          const materials = materialMesh.material as THREE.Material[];
          materials.forEach(material => {
            if (material instanceof THREE.MeshPhysicalMaterial) {
              material.userData = material.userData || {};
              material.userData.originalEmissive = material.emissive.clone();
            }
          });
        } else {
          const material = materialMesh.material as THREE.Material;
          material.userData = material.userData || {};
          material.userData.originalEmissive = (material as THREE.MeshPhysicalMaterial).emissive.clone();
        }
        
        group.add(materialMesh);
      }

      // Create color box layer if enabled
      if (showColorBox) {
        const colorMaterial = new THREE.MeshPhongMaterial({ 
          color: roomColors[room.room_type] || 0x808080,
          transparent: true,
          opacity: 0.5
        });
        
        const colorMesh = new THREE.Mesh(geometry, colorMaterial);
        colorMesh.rotation.x = Math.PI / 2;
        colorMesh.position.set(0, floorHeight, 0);
        colorMesh.userData.roomData = room;
        colorMesh.userData.layerType = 'color';
        colorMesh.userData.originalOpacity = 0.5;
        colorMesh.userData.roomId = roomId;
        colorMesh.userData.labelPosition = labelPosition.clone();
        colorMesh.userData.floorNum = floorNum;
        
        // Store original properties for hover effect
        colorMaterial.userData = colorMaterial.userData || {};
        colorMaterial.userData.originalEmissive = colorMaterial.emissive.clone();
        
        group.add(colorMesh);
      }

      // Create wireframe layer if enabled
      if (showWireframe) {
        const wireframeMaterialClone = wireframeMaterial.clone();
        wireframeMaterialClone.userData = wireframeMaterialClone.userData || {};
        wireframeMaterialClone.userData.originalOpacity = 0.1;
        
        const wireframeMesh = new THREE.Mesh(geometry.clone(), wireframeMaterialClone);
        wireframeMesh.rotation.x = Math.PI / 2;
        wireframeMesh.position.set(0, floorHeight, 0);
        wireframeMesh.userData.roomData = room;
        wireframeMesh.userData.layerType = 'wireframe';
        wireframeMesh.userData.roomId = roomId;
        wireframeMesh.userData.labelPosition = labelPosition.clone();
        wireframeMesh.userData.floorNum = floorNum;
        
        group.add(wireframeMesh);
      }

      // Add label
      if (showLabels) {
        const label = createRoomLabel(room, labelPosition, floorNum);
        label.userData.roomId = roomId;
        group.add(label);
      }

      return group;
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Helper function to reset hover effects
    const resetHoverEffects = () => {
      // Reset color layer
      if (hoveredObjectsRef.current.color) {
        const material = hoveredObjectsRef.current.color.material as THREE.MeshPhongMaterial;
        material.opacity = hoveredObjectsRef.current.color.userData.originalOpacity;
        material.emissive.copy(material.userData.originalEmissive);
        hoveredObjectsRef.current.color = null;
      }
      
      // Reset material layer
      if (hoveredObjectsRef.current.material) {
        const materials = Array.isArray(hoveredObjectsRef.current.material.material) 
          ? hoveredObjectsRef.current.material.material 
          : [hoveredObjectsRef.current.material.material];
        
        materials.forEach(mat => {
          if (mat instanceof THREE.MeshPhysicalMaterial && mat.userData.originalEmissive) {
            mat.emissive.copy(mat.userData.originalEmissive);
          }
        });
        
        hoveredObjectsRef.current.material = null;
      }
      
      // Reset wireframe layer
      if (hoveredObjectsRef.current.wireframe) {
        const material = hoveredObjectsRef.current.wireframe.material as THREE.MeshBasicMaterial;
        material.opacity = material.userData.originalOpacity;
        hoveredObjectsRef.current.wireframe = null;
      }
      
      // Hide all labels
      scene.traverse((object) => {
        if (object instanceof CSS2DObject) {
          const domElement = object.userData.domElement as HTMLDivElement;
          domElement.style.opacity = '0';
        }
      });
    };
    
    // Helper function to apply hover effects for a room
    const applyHoverEffects = (roomId: string) => {
      // Find all meshes with this roomId
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object.userData.roomId === roomId) {
          const layerType = object.userData.layerType;
          
          // Apply appropriate hover effect based on layer type
          if (layerType === 'color') {
            const material = object.material as THREE.MeshPhongMaterial;
            material.opacity = 1.0;
            material.emissive.set(0x222222);
            hoveredObjectsRef.current.color = object;
          } 
          else if (layerType === 'material') {
            const materials = Array.isArray(object.material) 
              ? object.material 
              : [object.material];
            
            materials.forEach(mat => {
              if (mat instanceof THREE.MeshPhysicalMaterial) {
                mat.emissive.set(0x222222);
              }
            });
            
            hoveredObjectsRef.current.material = object;
          }
          else if (layerType === 'wireframe') {
            const material = object.material as THREE.MeshBasicMaterial;
            material.opacity = 0.5;
            hoveredObjectsRef.current.wireframe = object;
          }
        }
        
        // Show label for this room
        if (object instanceof CSS2DObject && object.userData.roomId === roomId) {
          const domElement = object.userData.domElement as HTMLDivElement;
          domElement.style.opacity = '1';
        }
      });
    };
    
    const onMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      // Reset previous hover effects
      resetHoverEffects();

      // Find the first intersection that has roomData
      let foundValidIntersection = false;
      for (let i = 0; i < intersects.length; i++) {
        const intersectedObject = intersects[i].object as THREE.Mesh;
        const roomData = intersectedObject.userData.roomData;
        
        if (roomData && intersectedObject.userData.roomId) {
          // Apply hover effects for this room
          applyHoverEffects(intersectedObject.userData.roomId);
          
          // Update room info in state
          setHoveredRoom(roomData);
          foundValidIntersection = true;
          break;
        }
      }
      
      // If no valid intersection found
      if (!foundValidIntersection) {
        setHoveredRoom(null);
      }
    };

    // Event when mouse leaves the canvas
    const onMouseLeave = () => {
      resetHoverEffects();
      setHoveredRoom(null);
    };

    // Add event listeners
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseleave', onMouseLeave);

    // Clear scene
    scene.clear();
    scene.add(ambientLight);
    scene.add(directionalLight);

    // Building group
    const buildingGroup = new THREE.Group();

    // Add rooms for each floor
    buildingData.forEach((floor, index) => {
      const floorHeight = index * 10;
      
      floor.rooms.forEach(room => {
        const roomGroup = createRoom(room, floorHeight, index);
        buildingGroup.add(roomGroup);
      });
    });

    scene.add(buildingGroup);

    // Position camera
    const buildingHeight = buildingData.length * 10;
    const maxDimension = Math.max(maxX - minX, maxZ - minZ);
    camera.position.set(maxDimension * 1.5, buildingHeight * 1.2, maxDimension * 1.5);
    camera.lookAt(0, buildingHeight / 2, 0);

    // Animation loop with label renderer
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = 800 / 600;
      camera.updateProjectionMatrix();
      renderer.setSize(800, 600);
      labelRenderer.setSize(800, 600);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      resetHoverEffects();
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
        mountRef.current.removeChild(labelRenderer.domElement);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('mouseleave', onMouseLeave);
      }
    };
  }, [buildingData, showWireframe, showLabels, showMaterialMode, showColorBox]);

  return (
    <Card className="p-4 w-full max-w-4xl">
      <div className="flex flex-col gap-4">
        {!buildingData ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
            <Upload className="w-12 h-12 mb-4 text-gray-400" />
            <label className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer">
              Upload JSON File
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {error && <p className="mt-2 text-red-500">{error}</p>}
          </div>
        ) : (
          <>
            <div className="flex gap-4 items-center">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showColorBox}
                  onChange={() => setShowColorBox(prev => !prev)}
                  className="form-checkbox"
                />
                <span>Color Box Layer</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showMaterialMode}
                  onChange={() => setShowMaterialMode(prev => !prev)}
                  className="form-checkbox"
                />
                <span>Material Layer</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showWireframe}
                  onChange={() => setShowWireframe(prev => !prev)}
                  className="form-checkbox"
                />
                <span>Wireframe Layer</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={() => setShowLabels(prev => !prev)}
                  className="form-checkbox"
                />
                <span>Show Labels</span>
              </label>
              <button 
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={() => setBuildingData(null)}
              >
                Load New File
              </button>
            </div>
            <div ref={mountRef} className="w-full h-[600px] border rounded relative">
              {hoveredRoom && (
                <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white p-2 rounded">
                  <p>Type: {hoveredRoom.room_type}</p>
                  {hoveredRoom.room_name && <p>Name: {hoveredRoom.room_name}</p>}
                  {hoveredRoom.room_id && <p>ID: {hoveredRoom.room_id}</p>}
                </div>
              )}
            </div>
            <div className="text-center">
              Total Floors: {buildingData.length}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default BuildingViewer;